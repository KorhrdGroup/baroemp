import { findCareerProfileByUserId, getAssessmentResultRepository, getJobRepository } from "@/lib/repositories";
import { evaluateJobFit, type JobMatchDetail } from "./job-match.service";
import type { CareerProfile, Job, JobSearchFilter, JobSearchResult } from "@/types";

export interface JobWithMatch extends Job {
  match?: JobMatchDetail | null;
}

export interface JobSearchParams extends JobSearchFilter {
  userId?: string;
  anonymousId?: string;
}

export interface JobSearchView {
  items: JobWithMatch[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Job Search Service.
 *
 * UI(/jobs) -> 이 서비스 -> JobRepository -> Supabase 순으로만 접근한다 (UI가 DB를 직접 호출하지 않음).
 * 로그인 사용자는 Career Profile 기반 매칭 점수(JobMatchDetail)를 함께 계산해 반환하며,
 * sort=recommended일 때는 매칭 점수 기준으로 정렬한다 (프로필이 없으면 Repository의 기본 추천 정렬을 따른다).
 */
export async function searchJobs(params: JobSearchParams): Promise<JobSearchView> {
  const repo = getJobRepository();
  const result: JobSearchResult = await repo.search(params);

  let profile: CareerProfile | undefined;
  if (params.userId) {
    profile = (await findCareerProfileByUserId(params.userId)) ?? undefined;
  } else if (params.anonymousId) {
    profile = await getAnonymousCareerSignal(params.anonymousId);
  }

  let items: JobWithMatch[] = result.items.map((job) => ({
    ...job,
    match: profile ? evaluateJobFit(profile, job) : null,
  }));

  if ((params.sort === "recommended" || !params.sort) && profile) {
    items = [...items].sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0));
  }

  return { items, total: result.total, page: result.page, pageSize: result.pageSize };
}

/**
 * "김OO님에게 맞는 공고" 영역용 TOP Match 목록.
 * Career Profile이 없는 사용자(비회원 포함)는 빈 배열을 반환한다.
 */
export async function getRecommendedJobsForUser(userId: string | undefined, limit = 6): Promise<JobWithMatch[]> {
  if (!userId) return [];
  const profile = await findCareerProfileByUserId(userId);
  if (!profile) return [];

  const jobs = await getJobRepository().findAll({ activeOnly: true } as JobSearchFilter);
  const scored = jobs
    .map((job) => ({ job, match: evaluateJobFit(profile, job) }))
    .filter((x): x is { job: Job; match: JobMatchDetail } => Boolean(x.match) && x.match!.score > 0)
    .sort((a, b) => b.match.score - a.match.score);

  return scored.slice(0, limit).map(({ job, match }) => ({ ...job, match }));
}

export interface AnonymousRecommendation {
  occupationName: string;
  jobCategoryCode: string;
  jobs: Job[];
}

/**
 * 비회원의 최근 검사 결과(extractedProfile)를 evaluateJobFit이 읽을 수 있는 CareerProfile 모양으로 감싼다.
 * 실제 career_profiles row가 아니라 즉석에서 만든 값이므로 id/userId는 placeholder다.
 * Supabase Auth 로그인이 아직 없어 비회원도 "내 조건 비교"를 볼 수 있게 하기 위한 임시 브릿지다.
 */
export async function getAnonymousCareerSignal(anonymousId: string | undefined): Promise<CareerProfile | undefined> {
  if (!anonymousId) return undefined;
  const results = await getAssessmentResultRepository().findAll({ anonymousId });
  if (results.length === 0) return undefined;
  const latest = [...results].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))[0];
  const now = new Date().toISOString();
  return {
    id: `anon-signal-${anonymousId}`,
    userId: anonymousId,
    createdAt: now,
    updatedAt: now,
    ...latest.extractedProfile,
  } as CareerProfile;
}

/**
 * 비회원 "맞춤 채용공고" 영역용. 로그인 없이도 최근 완료한 검사 세션(anonymousId)이 있으면
 * 검사 TOP1 추천 직업과 관련된 공고를 보여준다 (Career Profile이 없어 매칭 점수는 계산하지 않는다).
 */
export async function getRecommendedJobsForAnonymous(
  anonymousId: string | undefined,
  limit = 6,
): Promise<AnonymousRecommendation | null> {
  if (!anonymousId) return null;
  const results = await getAssessmentResultRepository().findAll({ anonymousId });
  if (results.length === 0) return null;

  const latest = [...results].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))[0];
  const top = latest.recommendations[0];
  if (!top?.jobCategoryCode) return null;

  const jobs = await getJobRepository().findAll({
    jobCategory: top.jobCategoryCode,
    activeOnly: true,
  } as JobSearchFilter);
  if (jobs.length === 0) return null;

  return { occupationName: top.occupationName, jobCategoryCode: top.jobCategoryCode, jobs: jobs.slice(0, limit) };
}

/**
 * Assessment 결과 화면에서 "현재 관련 채용공고 N건 / 회원님의 조건과 높은 일치 M건" 표시에 사용한다.
 */
export async function countJobsForOccupation(
  jobCategoryCode: string | undefined,
  profile?: CareerProfile,
): Promise<{ total: number; highMatchCount: number }> {
  if (!jobCategoryCode) return { total: 0, highMatchCount: 0 };
  const jobs = await getJobRepository().findAll({ jobCategory: jobCategoryCode, activeOnly: true } as JobSearchFilter);
  if (!profile) return { total: jobs.length, highMatchCount: 0 };
  const highMatchCount = jobs.filter((job) => (evaluateJobFit(profile, job)?.score ?? 0) >= 70).length;
  return { total: jobs.length, highMatchCount };
}
