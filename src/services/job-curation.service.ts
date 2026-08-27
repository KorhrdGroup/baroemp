import { findCareerProfileByUserId, getCareerRequirementRepository, getJobRepository } from "@/lib/repositories";
import type { CareerProfile, Job, JobCurationItem, JobCurationResult, JobCurationTab, JobSearchFilter } from "@/types";
import { evaluateJobFit } from "./job-match.service";
import { compareUserToJobRequirements } from "./job-requirement-comparison.service";
import { buildHypotheticalProfile, getCareerGapResult, listCareerGapSummariesForUser } from "./career-gap-engine.service";

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
  for (const category of profile.desiredJobCategories ?? []) {
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
  const result = await repo.search({ activeOnly: true, page: 1, pageSize: 200, sort: "latest" });
  const now = Date.now();

  let jobs: Job[];
  if (kind === "new") {
    const cutoff = now - NEW_WITHIN_DAYS * 24 * 60 * 60 * 1000;
    jobs = result.items
      .filter((j) => j.postedAt && new Date(j.postedAt).getTime() >= cutoff)
      .sort((a, b) => ((a.postedAt ?? "") < (b.postedAt ?? "") ? 1 : -1));
  } else {
    const max = now + CLOSING_WITHIN_DAYS * 24 * 60 * 60 * 1000;
    jobs = result.items
      .filter((j) => {
        if (!j.applyDeadline) return false;
        const t = new Date(j.applyDeadline).getTime();
        return t >= now && t <= max;
      })
      .sort((a, b) => ((a.applyDeadline ?? "") > (b.applyDeadline ?? "") ? 1 : -1));
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
  if (!profile) return { state: "NEEDS_PROFILE" as const, items: [] };

  const top = scoreCandidates(profile, await getCandidateJobsForUser(userId)).slice(0, READY_CHECK_LIMIT);
  const items: JobCurationItem[] = [];
  for (const item of top) {
    const comparison = await compareUserToJobRequirements(userId, item.job);
    const blocked = comparison.some((c) => c.jobLevel === "REQUIRED" && c.userStatus === "NOT_SATISFIED");
    if (!blocked) items.push(item);
    if (items.length >= TAB_LIMIT) break;
  }
  return { state: items.length > 0 ? ("READY" as const) : ("EMPTY" as const), items };
}

async function getUnlockableTab(userId: string) {
  const profile = await findCareerProfileByUserId(userId);
  if (!profile) return { state: "NEEDS_PROFILE" as const, items: [] };

  const summaries = await listCareerGapSummariesForUser(userId, 1);
  const latest = summaries[0];
  if (!latest) return { state: "NEEDS_ANALYSIS" as const, items: [] };
  const result = await getCareerGapResult(latest.id);
  const target = result?.topPriorityItem;
  if (!result || !target) return { state: "NEEDS_ANALYSIS" as const, items: [] };

  const requirement = await getCareerRequirementRepository().findById(target.requirementId);
  if (!requirement) return { state: "NEEDS_ANALYSIS" as const, items: [] };
  const hypothetical = buildHypotheticalProfile(profile, requirement);

  const candidates = await getCandidateJobsForUser(userId);
  const items: JobCurationItem[] = [];
  for (const job of candidates) {
    const before = evaluateJobFit(profile, job);
    const after = evaluateJobFit(hypothetical, job);
    if (!after) continue;
    const beforeGrade = before?.grade ?? "D";
    if ((after.grade === "A" || after.grade === "B") && beforeGrade !== "A" && beforeGrade !== "B") {
      items.push({ job, matchScore: after.score, matchGrade: after.grade, unlockRequirementName: target.requirementName });
      if (items.length >= TAB_LIMIT) break;
    }
  }
  return { state: items.length > 0 ? ("READY" as const) : ("EMPTY" as const), items };
}

function scoreCandidates(profile: CareerProfile, jobs: Job[]): JobCurationItem[] {
  return jobs
    .map((job) => ({ job, match: evaluateJobFit(profile, job) }))
    .filter((x): x is { job: Job; match: NonNullable<ReturnType<typeof evaluateJobFit>> } => Boolean(x.match && x.match.score > 0))
    .sort((a, b) => b.match.score - a.match.score)
    .map(({ job, match }) => ({ job, matchScore: match.score, matchGrade: match.grade }));
}
