import {
  getCareerRequirementRepository,
  getEmploymentDestinationRepository,
  getJobRepository,
  getJobRequirementRepository,
  getMarketSnapshotRepository,
  getOccupationRepository,
} from "@/lib/repositories";
import { extractJobRequirements } from "@/lib/career-gap/requirement-normalizer";
import { classifyJob } from "./job-destination-classifier.service";
import { isUsingMockJobProvider } from "@/features/jobs/providers";
import {
  DEFAULT_MARKET_PERIOD_DAYS,
  MARKET_SNAPSHOT_CACHE_TTL_MS,
  computeMarketConfidence,
  round1,
} from "@/lib/career-gap/config";
import type { CareerGapRequirement, Job, JobSearchFilter, MarketRequirementSnapshot, MarketRequirementStat } from "@/types";

/**
 * 시장 통계 Engine (STEP 7.5 스펙 10번).
 * occupation/destination 단위로 관련 채용공고를 모아 career_requirements 각각에 대해
 * required/preferred/mention count·rate를 계산한다. AI가 임의로 만들어내는 값이 아니라
 * 항상 실제 jobs/job_requirements 데이터에서 산출한다 (스펙 49/50번 원칙).
 */
export async function getRelevantJobsForScope(params: {
  occupationId?: string;
  destinationId?: string;
  periodDays?: number;
}): Promise<Job[]> {
  const { occupationId, destinationId, periodDays = DEFAULT_MARKET_PERIOD_DAYS } = params;
  if (!occupationId) return [];

  const occupation = await getOccupationRepository().findById(occupationId);
  if (!occupation?.jobCategoryCode) return [];

  const allJobs = await getJobRepository().findAll({
    jobCategory: occupation.jobCategoryCode,
    activeOnly: false,
  } as JobSearchFilter);

  const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
  // 정책(스펙 12번): 최근 N일 + 활성/최근마감 공고. 활성 공고는 기간과 무관하게 항상 포함한다.
  const recent = allJobs.filter((job) => {
    if (job.isActive) return true;
    const ts = new Date(job.postedAt ?? job.createdAt).getTime();
    return Number.isFinite(ts) && ts >= cutoff;
  });

  if (!destinationId) return recent;

  const destinations = await getEmploymentDestinationRepository().findAll({ occupationId, status: "active" });
  return recent.filter((job) => {
    if (job.employmentDestinationId) return job.employmentDestinationId === destinationId;
    return classifyJob(job, destinations)?.id === destinationId;
  });
}

/**
 * jobs -> job_requirements 추출/저장 + 집계를 함께 수행한다.
 * persist=true(기본)면 job_requirements 테이블에도 반영해, 관리자 화면에서
 * "관련 공고 보기"처럼 근거 공고를 조회할 수 있게 한다 (스펙 19번).
 */
export async function computeMarketRequirementStats(
  jobs: Job[],
  requirements: CareerGapRequirement[],
  options: { persist?: boolean } = {},
): Promise<MarketRequirementStat[]> {
  const sampleSize = jobs.length;
  const buckets = new Map<string, { required: number; preferred: number; mentioned: number }>();
  for (const req of requirements) buckets.set(req.id, { required: 0, preferred: 0, mentioned: 0 });

  const jobRequirementRepo = getJobRequirementRepository();
  const persist = options.persist ?? true;

  for (const job of jobs) {
    const extracted = extractJobRequirements(job, requirements);
    if (persist) {
      await jobRequirementRepo.replaceForJob(
        job.id,
        extracted.map((e) => ({
          jobId: job.id,
          requirementId: e.requirementId,
          requirementLevel: e.requirementLevel,
          sourceText: e.sourceText,
          confidence: e.confidence,
        })),
      );
    }
    for (const e of extracted) {
      const bucket = buckets.get(e.requirementId);
      if (!bucket) continue;
      if (e.requirementLevel === "REQUIRED") bucket.required += 1;
      else if (e.requirementLevel === "PREFERRED") bucket.preferred += 1;
      else bucket.mentioned += 1;
    }
  }

  return requirements.map((req) => {
    const bucket = buckets.get(req.id)!;
    const mentionCount = bucket.required + bucket.preferred + bucket.mentioned;
    return {
      requirementId: req.id,
      requiredCount: bucket.required,
      preferredCount: bucket.preferred,
      mentionCount,
      requiredRate: sampleSize > 0 ? round1((bucket.required / sampleSize) * 100) : 0,
      preferredRate: sampleSize > 0 ? round1((bucket.preferred / sampleSize) * 100) : 0,
      mentionRate: sampleSize > 0 ? round1((mentionCount / sampleSize) * 100) : 0,
    } satisfies MarketRequirementStat;
  });
}

async function buildFreshSnapshot(params: {
  occupationId?: string;
  destinationId?: string;
  periodDays?: number;
}): Promise<MarketRequirementSnapshot> {
  const periodDays = params.periodDays ?? DEFAULT_MARKET_PERIOD_DAYS;
  const [jobs, requirements] = await Promise.all([
    getRelevantJobsForScope({ ...params, periodDays }),
    getCareerRequirementRepository().findAll({ status: "active" }),
  ]);
  const stats = await computeMarketRequirementStats(jobs, requirements);

  const now = new Date();
  const start = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  return {
    occupationId: params.occupationId,
    destinationId: params.destinationId,
    periodDays,
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: now.toISOString().slice(0, 10),
    sampleSize: jobs.length,
    confidence: computeMarketConfidence(jobs.length),
    requirements: stats,
    isMockData: isUsingMockJobProvider(),
    calculatedAt: now.toISOString(),
  };
}

/**
 * Snapshot 캐시를 우선 사용하고, 없거나 오래됐거나 forceRecalculate면 새로 계산해 저장한다 (스펙 46/47번).
 */
export async function getOrComputeMarketSnapshot(params: {
  occupationId?: string;
  destinationId?: string;
  periodDays?: number;
  forceRecalculate?: boolean;
}): Promise<MarketRequirementSnapshot> {
  const snapshotRepo = getMarketSnapshotRepository();

  if (!params.forceRecalculate) {
    const latest = await snapshotRepo.findLatest({ occupationId: params.occupationId, destinationId: params.destinationId });
    if (latest && Date.now() - new Date(latest.calculatedAt).getTime() < MARKET_SNAPSHOT_CACHE_TTL_MS) {
      return latest;
    }
  }

  const fresh = await buildFreshSnapshot(params);
  const saved = await snapshotRepo.create(fresh);
  return saved;
}

/** 관리자 "[시장 요구조건 다시 분석]" 액션 (스펙 47번). 캐시를 무시하고 항상 새로 계산한다. */
export async function recalculateMarketSnapshot(params: {
  occupationId?: string;
  destinationId?: string;
  periodDays?: number;
}): Promise<MarketRequirementSnapshot> {
  return getOrComputeMarketSnapshot({ ...params, forceRecalculate: true });
}
