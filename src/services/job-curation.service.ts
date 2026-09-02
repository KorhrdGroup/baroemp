import { findCareerProfileByUserId, getAssessmentResultRepository, getJobRepository } from "@/lib/repositories";
import type { CareerProfile, Job, JobCurationItem, JobCurationResult, JobCurationTab, JobSearchFilter } from "@/types";
import { evaluateJobFit } from "./job-match.service";
import { getRecommendedJobsFromAssessment } from "./assessment-job.service";
import { toJobCategoryPatterns } from "@/lib/jobs/job-category-groups";
import { compareUserToJobsRequirements, type JobRequirementComparisonItem } from "./job-requirement-comparison.service";
import { readinessFromComparison } from "@/features/jobs/job-readiness";

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
  const withBadges = async (result: JobCurationResult) => (await attachReadiness(userId, [result]))[0];
  try {
    switch (tab) {
      case "new":
        return withBadges({ tab, ...(await getCommonTab("new")) });
      case "closing_soon":
        return withBadges({ tab, ...(await getCommonTab("closing_soon")) });
      case "matched":
        return withBadges({ tab, ...(await getMatchedTab(await loadPersonalContext(userId))) });
      case "assessment_matched":
        return withBadges({ tab, ...(await getAssessmentMatchedTab(userId)) });
      case "ready_to_apply":
        return withBadges({ tab, ...(await getReadyToApplyTab(userId, await loadPersonalContext(userId))) });
      case "unlockable":
        return withBadges({ tab, ...(await getUnlockableTab(userId, await loadPersonalContext(userId))) });
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
/**
 * 다섯 탭을 한 번에 계산한다.
 *
 * 탭마다 따로 부르면 개인화 탭 세 개가 프로필·후보군 조회를 각각 되풀이한다.
 * 여기서는 컨텍스트를 한 벌만 만들어 넘기므로, 다섯 탭 전부를 받아도
 * 조회량은 개인화 탭 하나를 부를 때와 같다.
 */

/**
 * 탭 결과에 자격 배지를 붙인다.
 *
 * 신규·마감임박은 전 유저 공통이라 서버 캐시를 타는데, 배지는 회원마다 다르다.
 * 그래서 캐시에서 꺼낸 뒤 여기서 입힌다. 여러 탭에 같은 공고가 겹치므로
 * 전체를 한 번에 비교해 요건 사전·회원 스냅샷 조회를 한 벌로 끝낸다.
 */
async function attachReadiness(userId: string, results: JobCurationResult[]): Promise<JobCurationResult[]> {
  const jobs = [...new Map(results.flatMap((r) => r.items).map((i) => [i.job.id, i.job])).values()];
  if (jobs.length === 0) return results;

  const comparisons = await compareUserToJobsRequirements(userId, jobs);
  return results.map((result) => ({
    ...result,
    items: result.items.map((item) => ({
      ...item,
      readiness: readinessFromComparison(comparisons.get(item.job.id) ?? []),
    })),
  }));
}

export async function getAllJobCurations(userId: string): Promise<JobCurationResult[]> {
  try {
    const ctx = await loadPersonalContext(userId);
    const [newTab, closingSoon, matched, assessmentMatched, readyToApply, unlockable] = await Promise.all([
      getCommonTab("new"),
      getCommonTab("closing_soon"),
      getMatchedTab(ctx),
      getAssessmentMatchedTab(userId),
      getReadyToApplyTab(userId, ctx),
      getUnlockableTab(userId, ctx),
    ]);
    return attachReadiness(userId, [
      { tab: "new", ...newTab },
      { tab: "closing_soon", ...closingSoon },
      { tab: "matched", ...matched },
      { tab: "assessment_matched", ...assessmentMatched },
      { tab: "ready_to_apply", ...readyToApply },
      { tab: "unlockable", ...unlockable },
    ]);
  } catch (error) {
    console.error("[job-curation] 전체 탭 계산 실패", error);
    return [];
  }
}

export async function getCandidateJobsForUser(userId: string, limit = CANDIDATE_LIMIT): Promise<Job[]> {
  const profile = await findCareerProfileByUserId(userId);
  if (!profile) return [];

  const repo = getJobRepository();
  const filters: JobSearchFilter[] = [];
  for (const category of (profile.desiredJobCategories ?? []).slice(0, 5)) {
    /*
     * 프로필의 직종 값은 묶음 key('care_worker')거나 6자리 코드인데 jobs.job_category는
     * 워크넷 6자리 코드라, eq 비교로는 아무 공고도 걸리지 않았다. /jobs 검색과 같이
     * 코드 앞자리 like 매칭으로 바꾼다.
     */
    filters.push({ jobCategoryPatterns: toJobCategoryPatterns([category]), activeOnly: true, page: 1, pageSize: 250 });
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


/**
 * 개인화 탭(맞춤 추천·지금 지원가능·자격 따면 열리는) 공통 재료.
 *
 * 세 탭이 저마다 프로필과 후보군 500건을 다시 불러오면 같은 조회가 세 번 돈다.
 * 한 번 만들어 돌려쓰면 세 탭을 한 요청에 계산해도 조회는 한 벌로 끝난다.
 * 희망 직종·지역이 없어 개인화가 불가능하면 null.
 */
async function loadPersonalContext(
  userId: string,
): Promise<{ profile: CareerProfile; scored: JobCurationItem[] } | null> {
  const profile = await findCareerProfileByUserId(userId);
  if (!profile || ((profile.desiredJobCategories ?? []).length === 0 && !profile.region)) return null;
  return { profile, scored: scoreCandidates(profile, await getCandidateJobsForUser(userId)) };
}

type PersonalContext = Awaited<ReturnType<typeof loadPersonalContext>>;

async function getMatchedTab(ctx: PersonalContext) {
  if (!ctx) return { state: "NEEDS_PROFILE" as const, items: [] };
  const items = ctx.scored.slice(0, TAB_LIMIT);
  return { state: items.length > 0 ? ("READY" as const) : ("EMPTY" as const), items };
}

/** "진단 맞춤 공고" 탭: 직업진단에서 성향이 잘 맞았던(바로 지원 트랙) 직업의 최신 공고. */
async function getAssessmentMatchedTab(userId: string) {
  /*
    진단을 안 한 회원에게 "조건에 맞는 공고가 없다"고 하면 왜 비었는지 알 수 없다.
    진단 결과가 아예 없는 경우를 따로 갈라 진단으로 안내한다.
  */
  const hasAssessment = (await getAssessmentResultRepository().findAll({ userId }).catch(() => [])).length > 0;
  if (!hasAssessment) return { state: "NEEDS_ASSESSMENT" as const, items: [] };

  const assessment = await getRecommendedJobsFromAssessment({ userId }, TAB_LIMIT).catch(() => null);
  const ready = assessment?.ready;
  if (!ready || ready.jobs.length === 0) return { state: "EMPTY" as const, items: [] };
  return {
    state: "READY" as const,
    items: ready.jobs.map((job) => ({ job, matchReasonLabel: `진단 추천 "${ready.occupationName}"` })),
  };
}

async function getReadyToApplyTab(userId: string, ctx: PersonalContext) {
  if (!ctx) return { state: "NEEDS_PROFILE" as const, items: [] };

  const top = ctx.scored.slice(0, READY_CHECK_LIMIT);

  // requirements/사용자 상태맵을 1회만 로드하고 공고별로는 순수 함수만 반복하는 배치 경로 사용
  const comparisons = await compareUserToJobsRequirements(userId, top.map((item) => item.job));

  /*
    "지금 지원가능"은 필수 요건이 하나도 걸리지 않는 공고만 담는다.
    갖췄다고 확인된 것(SATISFIED)이 아니면 전부 뺀다.

    예전에는 미충족이 확인된 것만 뺐는데, 자격을 등록하지 않은 회원은 모든 자격이
    UNKNOWN 이라 "요양보호사 자격 필요" 배지가 붙은 공고가 이 탭에 그대로 들어왔다.
    카드와 탭이 서로 다른 말을 한 셈이다.

    이렇게 좁혀도 자격 요건이 아예 없는 공고가 대부분이라 탭이 비지 않는다.
  */
  const items: JobCurationItem[] = [];
  for (const item of top) {
    if (items.length >= TAB_LIMIT) break;
    const comparison = comparisons.get(item.job.id) ?? [];
    const blocked = comparison.some((c) => c.jobLevel === "REQUIRED" && c.userStatus !== "SATISFIED");
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
/**
 * "이 조건 하나만 채우면 열리는" 공고를 조건별로 모아, 가장 많은 공고를
 * 열어주는 조건 하나를 고른다. 걸림돌 판정 기준은 호출하는 쪽이 정한다.
 */
function pickUnlockRequirement(
  candidates: JobCurationItem[],
  comparisons: Map<string, JobRequirementComparisonItem[]>,
  isBlocker: (item: JobRequirementComparisonItem) => boolean,
): { name: string; items: JobCurationItem[] } | null {
  const byRequirement = new Map<string, { name: string; items: JobCurationItem[] }>();

  for (const item of candidates) {
    const blockers = (comparisons.get(item.job.id) ?? []).filter(
      (c) => c.jobLevel === "REQUIRED" && isBlocker(c),
    );
    if (blockers.length !== 1) continue;
    const blocker = blockers[0];
    const entry = byRequirement.get(blocker.requirementId) ?? { name: blocker.requirementName, items: [] };
    entry.items.push({ ...item, unlockRequirementName: blocker.requirementName });
    byRequirement.set(blocker.requirementId, entry);
  }

  return [...byRequirement.values()].sort((a, b) => b.items.length - a.items.length)[0] ?? null;
}

async function getUnlockableTab(userId: string, ctx: PersonalContext) {
  /*
    맞춤 추천 탭과 같은 구성: 진단 준비 트랙(성향은 맞는데 자격이 필요한 직업)의 공고를
    앞에 두고, 요건 사전 기반으로 찾은 "하나만 채우면 열리는" 공고를 뒤에 잇는다.
    상단 전용 섹션과 일부 겹칠 수 있지만, 탭만 보는 사람도 같은 추천을 받아야 한다.
  */
  const assessment = await getRecommendedJobsFromAssessment({ userId }, TAB_LIMIT).catch(() => null);
  const preparation = assessment?.preparation;
  const assessmentItems: JobCurationItem[] = (preparation?.jobs ?? []).map((job) => ({
    job,
    unlockRequirementName: preparation?.missingQualifications?.[0],
  }));

  let requirementItems: JobCurationItem[] = [];
  if (ctx) {
    const top = ctx.scored.slice(0, READY_CHECK_LIMIT);
    const comparisons = await compareUserToJobsRequirements(userId, top.map((item) => item.job));

    /*
      1차는 미충족이 확인된 자격만 본다.
      비면 아직 모르는 자격(UNKNOWN)까지 넓힌다. 자격을 한 건도 등록하지 않은 회원은
      모든 자격이 UNKNOWN 이라 1차에서 늘 빈 화면이 나왔는데, 그런 회원일수록
      "이거 하나 따면 이만큼 열려요"를 봐야 할 사람이다.
      후보군 자체가 희망 직종·지역에서 나오므로 관심 분야를 벗어나지 않는다.
    */
    const best =
      pickUnlockRequirement(top, comparisons, (c) => c.userStatus === "NOT_SATISFIED") ??
      pickUnlockRequirement(
        top,
        comparisons,
        (c) => c.userStatus === "NOT_SATISFIED" || c.userStatus === "UNKNOWN",
      );
    requirementItems = best?.items ?? [];
  }

  const seen = new Set(assessmentItems.map((i) => i.job.id));
  const items = [...assessmentItems, ...requirementItems.filter((i) => !seen.has(i.job.id))].slice(0, TAB_LIMIT);

  if (items.length > 0) return { state: "READY" as const, items };
  return ctx ? { state: "EMPTY" as const, items: [] } : { state: "NEEDS_PROFILE" as const, items: [] };
}

function scoreCandidates(profile: CareerProfile, jobs: Job[]): JobCurationItem[] {
  return jobs
    .map((job) => ({ job, match: evaluateJobFit(profile, job) }))
    .filter((x): x is { job: Job; match: NonNullable<ReturnType<typeof evaluateJobFit>> } => Boolean(x.match && x.match.score > 0))
    .sort((a, b) => b.match.score - a.match.score)
    .map(({ job, match }) => ({
      job,
      matchScore: match.score,
      matchGrade: match.grade,
      // reasons 는 배점 내림차순이라 첫 항목이 가장 크게 맞은 조건이다.
      matchReasonLabel: match.reasons[0]?.label,
    }));
}
