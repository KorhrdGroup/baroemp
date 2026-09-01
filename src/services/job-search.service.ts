import { findCareerProfileByUserId, getAssessmentResultRepository, getJobRepository } from "@/lib/repositories";
import { toJobCategoryPatterns } from "@/lib/jobs/job-category-groups";
import { evaluateJobFit, type JobMatchDetail } from "./job-match.service";
import { getCandidateJobsForUser } from "./job-curation.service";
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

  const jobs = await getCandidateJobsForUser(userId);
  const scored = jobs
    .map((job) => ({ job, match: evaluateJobFit(profile, job) }))
    .filter((x): x is { job: Job; match: JobMatchDetail } => Boolean(x.match) && x.match!.score > 0)
    .sort((a, b) => b.match.score - a.match.score);

  return scored.slice(0, limit).map(({ job, match }) => ({ ...job, match }));
}

export interface AssessmentJobRecommendation {
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
 * "검사 결과 기반 맞춤 공고" 영역용. 최근 완료한 진단의 추천 직업(직종코드가 있는 최상위)과
 * 관련된 공고를 보여준다.
 *
 * 회원(userId) 결과를 먼저 보고, 없으면 비회원(anonymousId) 결과로 넘어간다.
 * 예전에는 anonymousId 전용이어서, 가입하면서 결과가 회원 소유로 넘어간 사람은
 * 로그인 필수인 /jobs에서 이 영역을 영영 볼 수 없었다.
 */
export async function getRecommendedJobsFromAssessment(
  params: { userId?: string; anonymousId?: string },
  limit = 6,
): Promise<AssessmentJobRecommendation | null> {
  const repo = getAssessmentResultRepository();
  const results = params.userId ? await repo.findAll({ userId: params.userId }) : [];
  const fallback = results.length === 0 && params.anonymousId ? await repo.findAll({ anonymousId: params.anonymousId }) : [];
  const all = results.length > 0 ? results : fallback;
  if (all.length === 0) return null;

  const latest = [...all].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))[0];
  // 직종코드가 없는 직업(코드 미등록 occupation)은 공고와 이을 수 없으므로 다음 순위로 넘어간다.
  const top = latest.recommendations.find((rec) => rec.jobCategoryCode);
  if (!top?.jobCategoryCode) return null;

  // occupation의 직종 값에는 6자리 코드와 'social_worker' 같은 묶음 key가 섞여 있어 변환을 거친다.
  const { items } = await getJobRepository().search({
    jobCategoryPatterns: toJobCategoryPatterns([top.jobCategoryCode]),
    activeOnly: true,
    sort: "latest",
    page: 1,
    pageSize: limit,
  } as JobSearchFilter);
  if (items.length === 0) return null;

  return { occupationName: top.occupationName, jobCategoryCode: top.jobCategoryCode, jobs: items };
}

/**
 * Assessment 결과 화면에서 "현재 관련 채용공고 N건 / 회원님의 조건과 높은 일치 M건" 표시에 사용한다.
 *
 * 세는 기준은 결과 화면의 "채용공고 보기" 링크와 같아야 한다.
 * 링크는 직업 이름으로 검색해 넘기므로 여기서도 이름으로 센다.
 * (직종 코드로 세면 표시된 건수와 눌러서 도착한 목록의 건수가 어긋난다)
 */
/**
 * 적합도를 따져 볼 공고 수의 상한.
 *
 * "운전"처럼 흔한 말은 6천 건 넘게 걸린다. 전부 내려받아 세면 결과 화면 한 장에
 * 십수 초가 걸려, 눌러도 아무 일이 없는 것처럼 보였다. 건수 자체는 DB 가 세 주므로
 * 정확하고, 적합도는 추천순 위쪽 이만큼만 따져 본다.
 */
const FIT_SCAN_LIMIT = 200;

/**
 * 같은 직업의 건수를 잠깐 기억해 둔다.
 *
 * 결과 화면 한 장이 추천 직업 다섯을 세는데, 새로고침하거나 다른 회원이 같은 직업을
 * 보면 같은 질문을 또 던진다. 공고는 하루 한 번 동기화되므로 몇 분 묵은 값이어도
 * 화면에 적는 "관련 채용공고 N건"으로는 충분하다.
 *
 * 적합도는 회원 조건에 따라 달라지므로 조건까지 열쇠에 넣는다.
 */
const COUNT_TTL_MS = 5 * 60 * 1000;
const countCache = new Map<string, { at: number; value: { total: number; highMatchCount: number } }>();

function fitKey(occupationName: string, profile?: CareerProfile): string {
  if (!profile) return `${occupationName}|-`;
  return [
    occupationName,
    profile.region ?? "",
    profile.desiredSalaryMin ?? "",
    profile.desiredSalaryMax ?? "",
    (profile.desiredJobCategories ?? []).join(","),
    (profile.desiredWorkTypes ?? []).join(","),
    (profile.heldQualifications ?? []).join(","),
    profile.employmentStatus ?? "",
    profile.careerYears ?? "",
    profile.canDrive ?? "",
    profile.ageGroup ?? "",
    (profile.interestTags ?? []).join(","),
  ].join("|");
}

export async function countJobsForOccupation(
  occupationName: string | undefined,
  profile?: CareerProfile,
): Promise<{ total: number; highMatchCount: number }> {
  if (!occupationName) return { total: 0, highMatchCount: 0 };

  const key = fitKey(occupationName, profile);
  const hit = countCache.get(key);
  if (hit && Date.now() - hit.at < COUNT_TTL_MS) return hit.value;

  const filter = { keyword: occupationName, activeOnly: true } as JobSearchFilter;

  // 총 건수는 행을 받아오지 않고 DB 가 센 값을 그대로 쓴다.
  if (!profile) {
    const { total } = await getJobRepository().search({ ...filter, page: 1, pageSize: 1 });
    const value = { total, highMatchCount: 0 };
    countCache.set(key, { at: Date.now(), value });
    return value;
  }

  const { items, total } = await getJobRepository().search({
    ...filter,
    page: 1,
    pageSize: FIT_SCAN_LIMIT,
    sort: "recommended",
  });
  const highMatchCount = items.filter((job) => (evaluateJobFit(profile, job)?.score ?? 0) >= 70).length;
  const value = { total, highMatchCount };
  countCache.set(key, { at: Date.now(), value });
  return value;
}
