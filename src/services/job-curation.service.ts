import { findCareerProfileByUserId, getJobRepository } from "@/lib/repositories";
import type { CareerProfile, Job, JobCurationItem, JobCurationResult, JobCurationTab, JobSearchFilter } from "@/types";
import { evaluateJobFit } from "./job-match.service";
import { compareUserToJobsRequirements } from "./job-requirement-comparison.service";

const TAB_LIMIT = 8;
const CANDIDATE_LIMIT = 500;
const READY_CHECK_LIMIT = 50;
const NEW_WITHIN_DAYS = 3;
const CLOSING_WITHIN_DAYS = 7;
const COMMON_CACHE_TTL_MS = 10 * 60 * 1000;

/** 신규/마감임박은 전 유저 공통이므로 서버 메모리 캐시(TTL 10분)로 반복 계산을 막는다. */
const commonTabCache = new Map<string, { at: number; items: JobCurationItem[] }>();

/**
 * 채용공고 큐레이션 서비스 (설계: docs/superpowers/specs/2026-08-27-job-curation-section-design.md).
 * 모든 판정은 기존 엔진(evaluateJobFit / 요건 비교 / counterfactual)의 결정론적 산출값이다.
 * 개인화 탭은 절대 전체 jobs를 스캔하지 않는다 - getCandidateJobsForUser로 후보군 500건 제한.
 */
export async function getJobCuration(userId: string, tab: JobCurationTab): Promise<JobCurationResult> {
  try {
    switch (tab) {
      case "new":
        return { tab, ...(await getCommonTab("new")) };
      case "closing_soon":
        return { tab, ...(await getCommonTab("closing_soon")) };
      case "matched":
        return { tab, ...(await getMatchedTab(userId)) };
      case "ready_to_apply":
        return { tab, ...(await getReadyToApplyTab(userId)) };
      case "unlockable":
        return { tab, ...(await getUnlockableTab(userId)) };
      default:
        return { tab, state: "EMPTY", items: [] };
    }
  } catch (error) {
    console.error(`[job-curation] ${tab} 탭 계산 실패`, error);
    return { tab, state: "EMPTY", items: [] };
  }
}

/**
 * 개인화 탭 공용 후보군: 희망 직종코드별 최신 공고 + 희망 지역 최신 공고를 합쳐
 * 최신순 상한 limit건. 6만+건 전체 스캔을 막는 성능 경계다.
 */
export async function getCandidateJobsForUser(userId: string, limit = CANDIDATE_LIMIT): Promise<Job[]> {
  const profile = await findCareerProfileByUserId(userId);
  if (!profile) return [];

  const repo = getJobRepository();
  const filters: JobSearchFilter[] = [];
  for (const category of (profile.desiredJobCategories ?? []).slice(0, 5)) {
    filters.push({ jobCategory: category, activeOnly: true, page: 1, pageSize: 250 });
  }
  if (profile.region) {
    filters.push({ region: profile.region, activeOnly: true, page: 1, pageSize: 250 });
  }
  if (filters.length === 0) return [];

  const results = await Promise.all(filters.map((f) => repo.search(f)));
  const byId = new Map<string, Job>();
  for (const r of results) for (const job of r.items) byId.set(job.id, job);

  return [...byId.values()]
    .sort((a, b) => ((a.postedAt ?? a.createdAt) < (b.postedAt ?? b.createdAt) ? 1 : -1))
    .slice(0, limit);
}

async function getCommonTab(kind: "new" | "closing_soon"): Promise<{ state: "READY" | "EMPTY"; items: JobCurationItem[] }> {
  const cached = commonTabCache.get(kind);
  if (cached && Date.now() - cached.at < COMMON_CACHE_TTL_MS) {
    return { state: cached.items.length > 0 ? "READY" : "EMPTY", items: cached.items };
  }

  const repo = getJobRepository();
  const now = Date.now();

  let result;
  if (kind === "new") {
    result = await repo.search({ activeOnly: true, page: 1, pageSize: 200, sort: "latest" });
  } else {
    result = await repo.search({ activeOnly: true, closingWithinDays: CLOSING_WITHIN_DAYS, sort: "deadline", page: 1, pageSize: TAB_LIMIT });
  }

  let jobs: Job[];
  if (kind === "new") {
    const cutoff = now - NEW_WITHIN_DAYS * 24 * 60 * 60 * 1000;
    jobs = result.items
      .filter((j) => j.postedAt && new Date(j.postedAt).getTime() >= cutoff)
      .sort((a, b) => ((a.postedAt ?? "") < (b.postedAt ?? "") ? 1 : -1));
  } else {
    jobs = result.items;
  }

  const items = jobs.slice(0, TAB_LIMIT).map((job) => ({ job }));
  commonTabCache.set(kind, { at: now, items });
  return { state: items.length > 0 ? "READY" : "EMPTY", items };
}

async function getMatchedTab(userId: string) {
  const profile = await findCareerProfileByUserId(userId);
  if (!profile || ((profile.desiredJobCategories ?? []).length === 0 && !profile.region)) {
    return { state: "NEEDS_PROFILE" as const, items: [] };
  }
  const items = scoreCandidates(profile, await getCandidateJobsForUser(userId)).slice(0, TAB_LIMIT);
  return { state: items.length > 0 ? ("READY" as const) : ("EMPTY" as const), items };
}

async function getReadyToApplyTab(userId: string) {
  const profile = await findCareerProfileByUserId(userId);
  if (!profile || ((profile.desiredJobCategories ?? []).length === 0 && !profile.region)) {
    return { state: "NEEDS_PROFILE" as const, items: [] };
  }

  const top = scoreCandidates(profile, await getCandidateJobsForUser(userId)).slice(0, READY_CHECK_LIMIT);

  // requirements/사용자 상태맵을 1회만 로드하고 공고별로는 순수 함수만 반복하는 배치 경로 사용
  const comparisons = await compareUserToJobsRequirements(userId, top.map((item) => item.job));

  // 결과에서 blocked 아닌 것을 순서대로 골라 TAB_LIMIT개 추출
  const items: JobCurationItem[] = [];
  for (const item of top) {
    if (items.length >= TAB_LIMIT) break;
    const comparison = comparisons.get(item.job.id) ?? [];
    const blocked = comparison.some((c) => c.jobLevel === "REQUIRED" && c.userStatus === "NOT_SATISFIED");
    if (!blocked) items.push(item);
  }

  return { state: items.length > 0 ? ("READY" as const) : ("EMPTY" as const), items };
}

/**
 * "자격 따면 열리는 공고".
 * 별도의 준비도 분석을 요구하지 않고, 이력서·보유자격·스킬·경험뱅크에서 계산한 요건 충족 상태
 * (computeUserRequirementStatuses)와 공고 원문 요건만으로 판정한다.
 * 필수 요건 중 미충족이 "딱 하나"인 공고를 모아, 그 하나로 가장 많은 공고가 열리는 조건을 고른다.
 */
async function getUnlockableTab(userId: string) {
  const profile = await findCareerProfileByUserId(userId);
  if (!profile || ((profile.desiredJobCategories ?? []).length === 0 && !profile.region)) {
    return { state: "NEEDS_PROFILE" as const, items: [] };
  }

  const top = scoreCandidates(profile, await getCandidateJobsForUser(userId)).slice(0, READY_CHECK_LIMIT);
  const comparisons = await compareUserToJobsRequirements(userId, top.map((item) => item.job));

  // 조건별로 "이 하나만 채우면 지원 가능해지는" 공고를 모은다.
  const byRequirement = new Map<string, { name: string; items: JobCurationItem[] }>();
  for (const item of top) {
    const blockers = (comparisons.get(item.job.id) ?? []).filter(
      (c) => c.jobLevel === "REQUIRED" && c.userStatus === "NOT_SATISFIED",
    );
    if (blockers.length !== 1) continue;
    const blocker = blockers[0];
    const entry = byRequirement.get(blocker.requirementId) ?? { name: blocker.requirementName, items: [] };
    entry.items.push({ ...item, unlockRequirementName: blocker.requirementName });
    byRequirement.set(blocker.requirementId, entry);
  }

  // 가장 많은 공고를 열어주는 조건 하나만 보여준다.
  const best = [...byRequirement.values()].sort((a, b) => b.items.length - a.items.length)[0];
  if (!best) return { state: "EMPTY" as const, items: [] };
  return { state: "READY" as const, items: best.items.slice(0, TAB_LIMIT) };
}

function scoreCandidates(profile: CareerProfile, jobs: Job[]): JobCurationItem[] {
  return jobs
    .map((job) => ({ job, match: evaluateJobFit(profile, job) }))
    .filter((x): x is { job: Job; match: NonNullable<ReturnType<typeof evaluateJobFit>> } => Boolean(x.match && x.match.score > 0))
    .sort((a, b) => b.match.score - a.match.score)
    .map(({ job, match }) => ({ job, matchScore: match.score, matchGrade: match.grade }));
}
