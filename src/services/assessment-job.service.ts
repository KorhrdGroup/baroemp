import { getAssessmentResultRepository, getJobRepository } from "@/lib/repositories";
import { toJobCategoryPatterns } from "@/lib/jobs/job-category-groups";
import { isPreferredQualification, qualificationName } from "@/lib/qualification";
import { splitRecommendationTracks } from "@/features/assessment/recommendation-tracks";
import type { Job, JobSearchFilter, OccupationRecommendation } from "@/types";

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
}

export interface AssessmentJobSections {
  /** 지금 조건으로 지원 가능한 상위 직업의 공고 */
  ready: AssessmentJobRecommendation | null;
  /** 성향은 맞지만 자격이 필요한 상위 직업의 공고 ("자격 따면 열리는") */
  preparation: AssessmentJobRecommendation | null;
}

/** 직종코드가 있는 추천 직업의 최신 공고를 찾는다. 코드 미등록 직업은 공고와 이을 수 없어 건너뛴다. */
async function findJobsForTopRecommendation(
  recommendations: OccupationRecommendation[],
  limit: number,
): Promise<AssessmentJobRecommendation | null> {
  const top = recommendations.find((rec) => rec.jobCategoryCode);
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

  const missingQualifications = top.requiredQualifications
    .filter((q) => !isPreferredQualification(q) && top.missingConditions.includes(q))
    .map(qualificationName);

  return { occupationName: top.occupationName, jobCategoryCode: top.jobCategoryCode, jobs: items, missingQualifications };
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
  const [readySection, preparationSection] = await Promise.all([
    findJobsForTopRecommendation(ready, limit),
    findJobsForTopRecommendation(preparation, Math.min(limit, 4)),
  ]);
  if (!readySection && !preparationSection) return null;

  return { ready: readySection, preparation: preparationSection };
}
