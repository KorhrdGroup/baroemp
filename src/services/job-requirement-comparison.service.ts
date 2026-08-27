import { getCareerRequirementRepository } from "@/lib/repositories";
import { extractJobRequirements } from "@/lib/career-gap/requirement-normalizer";
import { computeUserRequirementStatuses } from "./user-requirement-status.service";
import type { UserRequirementStatusResult } from "./user-requirement-status.service";
import type { CareerGapRequirement, Job, RequirementCategory, RequirementLevel, UserRequirementStatus } from "@/types";

export interface JobRequirementComparisonItem {
  requirementId: string;
  requirementName: string;
  requirementCategory: RequirementCategory;
  jobLevel: RequirementLevel;
  userStatus: UserRequirementStatus;
}

const STATUS_ORDER: Record<UserRequirementStatus, number> = { NOT_SATISFIED: 0, CHECK_REQUIRED: 1, UNKNOWN: 2, SATISFIED: 3 };

/**
 * Job Detail(스펙 35번)에서 "이 공고와 내 준비상태 비교"에 쓰는 공고 단위 상세 비교.
 * job_requirements 사전 저장 여부와 무관하게, 이 Job 원문에서 즉시 추출(extractJobRequirements)해
 * 항상 최신 원문 기준으로 충족/미충족/확인필요를 계산한다.
 */
export async function compareUserToJobRequirements(userId: string, job: Job): Promise<JobRequirementComparisonItem[]> {
  const requirements = await getCareerRequirementRepository().findAll({ status: "active" });
  const statusMap = await computeUserRequirementStatuses(userId, requirements);
  return buildComparisonItems(job, requirements, statusMap);
}

/**
 * ready_to_apply 탭처럼 다수의 Job을 한 번에 비교해야 할 때 쓰는 배치 경로.
 * requirements findAll + 사용자 스냅샷(computeUserRequirementStatuses)을 1회만 로드하고,
 * 공고별로는 순수 함수(extractJobRequirements + 상태맵 조회)만 반복한다.
 * (compareUserToJobRequirements를 N회 호출하면 호출마다 위 두 조회가 재실행되어 성능 이슈가 생긴다.)
 */
export async function compareUserToJobsRequirements(userId: string, jobs: Job[]): Promise<Map<string, JobRequirementComparisonItem[]>> {
  const requirements = await getCareerRequirementRepository().findAll({ status: "active" });
  const statusMap = await computeUserRequirementStatuses(userId, requirements);

  const result = new Map<string, JobRequirementComparisonItem[]>();
  for (const job of jobs) {
    result.set(job.id, buildComparisonItems(job, requirements, statusMap));
  }
  return result;
}

function buildComparisonItems(
  job: Job,
  requirements: CareerGapRequirement[],
  statusMap: Map<string, UserRequirementStatusResult>,
): JobRequirementComparisonItem[] {
  const extracted = extractJobRequirements(job, requirements);
  if (extracted.length === 0) return [];

  const requirementById = new Map(requirements.map((r) => [r.id, r]));

  return extracted
    .map((e) => {
      const requirement = requirementById.get(e.requirementId);
      if (!requirement) return null;
      return {
        requirementId: requirement.id,
        requirementName: requirement.name,
        requirementCategory: requirement.category,
        jobLevel: e.requirementLevel,
        userStatus: statusMap.get(requirement.id)?.status ?? "UNKNOWN",
      } satisfies JobRequirementComparisonItem;
    })
    .filter((x): x is JobRequirementComparisonItem => Boolean(x))
    .sort((a, b) => STATUS_ORDER[a.userStatus] - STATUS_ORDER[b.userStatus]);
}
