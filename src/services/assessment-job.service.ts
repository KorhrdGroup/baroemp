import { findCareerProfileByUserId, getAssessmentResultRepository, getJobRepository } from "@/lib/repositories";
import { toJobCategoryPatterns } from "@/lib/jobs/job-category-groups";
import { isPreferredQualification, qualificationName } from "@/lib/qualification";
import { splitRecommendationTracks } from "@/features/assessment/recommendation-tracks";
import type { Job, JobSearchFilter, OccupationRecommendation, Region } from "@/types";

/**
 * 직업진단 결과 → 채용공고 연결 서비스.
 *
 * job-search.service 에 있던 것을 분리했다. 큐레이션(job-curation.service)도
 * "자격 따면 열리는" 탭에서 이 조회를 쓰는데, job-search 가 job-curation 을
 * 이미 가져다 쓰고 있어 그대로 두면 순환 참조가 된다.
 */

export interface AssessmentJobRecommendation {
  occupationName: string;
  jobCategoryCode: string;
  jobs: Job[];
  /** 준비 트랙일 때, 지원을 막고 있는 필수 자격 이름들. */
  missingQualifications?: string[];
  /**
   * 희망지역 공고가 모자라 다른 지역에서 채워 온 공고의 id.
   * 화면에서 "희망지역 공고가 아니다"라고 알려 주기 위한 값이다.
   * 아무 표시 없이 섞으면 회원은 집 근처 공고인 줄 알고 들어간다.
   */
  outsideRegionJobIds?: string[];
}

export interface AssessmentJobSections {
  /** 지금 조건으로 지원 가능한 상위 직업의 공고 */
  ready: AssessmentJobRecommendation | null;
  /** 성향은 맞지만 자격이 필요한 상위 직업의 공고 ("자격 따면 열리는") */
  preparation: AssessmentJobRecommendation | null;
}

/**
 * "정사서(준사서)"·"사회복지사 2급" 같은 자격 이름을 공고 원문에서 찾을 검색어들로 편다.
 * 공고는 "사회복지사 자격증 소지자"처럼 급수 없이 쓰는 일이 많아 급수를 뗀 기본형도 넣는다.
 */
function qualificationKeywords(name: string): string[] {
  const compact = name.replace(/\s+/g, "");
  const withoutGrade = compact.replace(/\d+급$/, "");
  const parts = compact.split(/[()·,/]/).filter((p) => p.length >= 2);
  return [...new Set([compact, withoutGrade, ...parts].filter((p) => p.length >= 2))];
}

/** 공고 원문(제목·설명·자격요건)이 해당 자격들 중 하나라도 언급하는지. 공백 차이는 무시한다. */
function jobMentionsAnyQualification(job: Job, qualificationNames: string[]): boolean {
  const haystack = [job.title, job.description, job.qualificationRequirements, job.requirements]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, "");
  return qualificationNames.some((name) => qualificationKeywords(name).some((kw) => haystack.includes(kw)));
}

/** 자격 언급 필터를 걸 때, 최신순으로 몇 건까지 훑어볼지. */
const QUALIFICATION_SCAN_POOL = 60;

/**
 * 추천 직업들의 공고를 순위대로 찾아, 공고가 실제로 있는 첫 직업을 쓴다.
 * 코드 미등록 직업과 (준비 트랙에서) 자격을 요구하는 공고가 없는 직업은 건너뛴다.
 */
async function findJobsForTopRecommendation(
  recommendations: OccupationRecommendation[],
  limit: number,
  region?: Region,
): Promise<AssessmentJobRecommendation | null> {
  for (const top of recommendations) {
    if (!top.jobCategoryCode) continue;
    const found = await findJobsForRecommendation(top, limit, region);
    if (found) return found;
  }
  return null;
}

async function findJobsForRecommendation(
  top: OccupationRecommendation,
  limit: number,
  region?: Region,
): Promise<AssessmentJobRecommendation | null> {
  if (!top.jobCategoryCode) return null;

  const missingQualifications = top.requiredQualifications
    .filter((q) => !isPreferredQualification(q) && top.missingConditions.includes(q))
    .map(qualificationName);

  /*
    준비 트랙(미보유 필수 자격이 있는 직업)은 그 자격을 실제로 요구하는 공고만 남긴다.
    직종 코드로만 가져오면 자격이 필요 없는 공고까지 "자격 따면 열리는"에 섞여서,
    카드의 "자격 요건 없음" 배지와 섹션 제목이 서로 다른 말을 했다.
  */
  const needsQualificationFilter = missingQualifications.length > 0;

  // occupation의 직종 값에는 6자리 코드와 'social_worker' 같은 묶음 key가 섞여 있어 변환을 거친다.
  const fetchJobs = async (searchRegion?: Region): Promise<Job[]> => {
    const { items } = await getJobRepository().search({
      jobCategoryPatterns: toJobCategoryPatterns([top.jobCategoryCode as string]),
      region: searchRegion,
      activeOnly: true,
      sort: "latest",
      page: 1,
      pageSize: needsQualificationFilter ? QUALIFICATION_SCAN_POOL : limit,
    } as JobSearchFilter);
    return needsQualificationFilter
      ? items.filter((job) => jobMentionsAnyQualification(job, missingQualifications))
      : items;
  };

  // 희망 지역 공고를 먼저 채우고, 모자라면 전국 공고로 뒤를 잇는다 (중복 제거).
  const regional = region ? await fetchJobs(region) : [];
  let jobs = regional.slice(0, limit);
  const outsideRegionJobIds: string[] = [];
  if (jobs.length < limit) {
    const seen = new Set(jobs.map((j) => j.id));
    const nationwide = (await fetchJobs()).filter((j) => !seen.has(j.id));
    const filler = nationwide.slice(0, limit - jobs.length);
    // 희망지역을 모르면 애초에 전국이 기준이라 "지역 밖"이라고 할 것이 없다.
    if (region) outsideRegionJobIds.push(...filler.filter((j) => j.region !== region).map((j) => j.id));
    jobs = [...jobs, ...filler];
  }
  if (jobs.length === 0) return null;

  return {
    occupationName: top.occupationName,
    jobCategoryCode: top.jobCategoryCode,
    jobs,
    missingQualifications,
    outsideRegionJobIds,
  };
}

/**
 * "검사 결과 기반 맞춤 공고" 영역용. 최근 완료한 진단의 추천을 두 트랙으로 나눠,
 * 각 트랙 상위 직업의 공고를 보여준다 - 지금 지원 가능한 직업과 "자격 따면 열리는" 직업.
 *
 * 회원(userId) 결과를 먼저 보고, 없으면 비회원(anonymousId) 결과로 넘어간다.
 * 예전에는 anonymousId 전용이어서, 가입하면서 결과가 회원 소유로 넘어간 사람은
 * 로그인 필수인 /jobs에서 이 영역을 영영 볼 수 없었다.
 */
export async function getRecommendedJobsFromAssessment(
  params: { userId?: string; anonymousId?: string },
  limit = 6,
): Promise<AssessmentJobSections | null> {
  const repo = getAssessmentResultRepository();
  const results = params.userId ? await repo.findAll({ userId: params.userId }) : [];
  const fallback = results.length === 0 && params.anonymousId ? await repo.findAll({ anonymousId: params.anonymousId }) : [];
  const all = results.length > 0 ? results : fallback;
  if (all.length === 0) return null;

  const latest = [...all].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))[0];
  const { ready, preparation } = splitRecommendationTracks(latest.recommendations);

  // 직종만 맞추면 강원·경북 공고가 충남 회원에게 온다. 희망 지역(프로필 우선, 없으면 진단 답변)을 함께 맞춘다.
  const careerProfile = params.userId ? await findCareerProfileByUserId(params.userId) : null;
  const region = careerProfile?.region ?? latest.extractedProfile.region;

  const [readySection, preparationSection] = await Promise.all([
    findJobsForTopRecommendation(ready, limit, region),
    findJobsForTopRecommendation(preparation, Math.min(limit, 4), region),
  ]);
  if (!readySection && !preparationSection) return null;

  return { ready: readySection, preparation: preparationSection };
}
