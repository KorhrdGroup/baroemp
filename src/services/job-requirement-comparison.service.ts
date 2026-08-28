import { cache } from "react";
import { getCareerRequirementRepository } from "@/lib/repositories";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
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
  /** 이 조건에 걸린 자격의 종류. 못 갖춘 자격의 준비 경로를 안내하는 데 쓴다. */
  qualificationType?: string;
}

/**
 * 요건에 연결된 자격의 종류(NATIONAL_LICENSE / PRIVATE_CERTIFICATE / OTHER)를 모아 온다.
 * 경험·스킬처럼 자격이 연결되지 않은 요건은 값이 없다.
 *
 * 요건 사전은 7건 남짓이고 요청 안에서 여러 번 불리므로 cache 로 한 번만 조회한다.
 */
const loadQualificationTypes = cache(async (ids: string[]): Promise<Map<string, string>> => {
  const client = createAdminSupabaseClient();
  if (!client || ids.length === 0) return new Map();

  const { data, error } = await client.from("qualifications").select("id, type").in("id", ids);
  if (error) {
    // 종류를 몰라도 비교 자체는 보여줄 수 있다. 준비 안내만 빠진다.
    console.error("[job-requirement-comparison] 자격 종류 조회 실패", error);
    return new Map();
  }
  return new Map((data ?? []).map((row) => [row.id as string, row.type as string]));
});

const STATUS_ORDER: Record<UserRequirementStatus, number> = { NOT_SATISFIED: 0, CHECK_REQUIRED: 1, UNKNOWN: 2, SATISFIED: 3 };

/**
 * Job Detail(스펙 35번)에서 "이 공고와 내 준비상태 비교"에 쓰는 공고 단위 상세 비교.
 * job_requirements 사전 저장 여부와 무관하게, 이 Job 원문에서 즉시 추출(extractJobRequirements)해
 * 항상 최신 원문 기준으로 충족/미충족/확인필요를 계산한다.
 */
export async function compareUserToJobRequirements(userId: string, job: Job): Promise<JobRequirementComparisonItem[]> {
  const requirements = await getCareerRequirementRepository().findAll({ status: "active" });
  const [statusMap, qualificationTypes] = await Promise.all([
    computeUserRequirementStatuses(userId, requirements),
    loadQualificationTypes(collectQualificationIds(requirements)),
  ]);
  return buildComparisonItems(job, requirements, statusMap, qualificationTypes);
}

/**
 * ready_to_apply 탭처럼 다수의 Job을 한 번에 비교해야 할 때 쓰는 배치 경로.
 * requirements findAll + 사용자 스냅샷(computeUserRequirementStatuses)을 1회만 로드하고,
 * 공고별로는 순수 함수(extractJobRequirements + 상태맵 조회)만 반복한다.
 * (compareUserToJobRequirements를 N회 호출하면 호출마다 위 두 조회가 재실행되어 성능 이슈가 생긴다.)
 */
export async function compareUserToJobsRequirements(userId: string, jobs: Job[]): Promise<Map<string, JobRequirementComparisonItem[]>> {
  const requirements = await getCareerRequirementRepository().findAll({ status: "active" });
  const [statusMap, qualificationTypes] = await Promise.all([
    computeUserRequirementStatuses(userId, requirements),
    loadQualificationTypes(collectQualificationIds(requirements)),
  ]);

  const result = new Map<string, JobRequirementComparisonItem[]>();
  for (const job of jobs) {
    result.set(job.id, buildComparisonItems(job, requirements, statusMap, qualificationTypes));
  }
  return result;
}

function collectQualificationIds(requirements: CareerGapRequirement[]): string[] {
  return [...new Set(requirements.map((r) => r.relatedQualificationId).filter((id): id is string => Boolean(id)))];
}

function buildComparisonItems(
  job: Job,
  requirements: CareerGapRequirement[],
  statusMap: Map<string, UserRequirementStatusResult>,
  qualificationTypes: Map<string, string>,
): JobRequirementComparisonItem[] {
  const extracted = extractJobRequirements(job, requirements);
  if (extracted.length === 0) return [];

  const requirementById = new Map(requirements.map((r) => [r.id, r]));

  return extracted
    .map((e) => {
      const requirement = requirementById.get(e.requirementId);
      if (!requirement) return null;
      const qualificationType = requirement.relatedQualificationId
        ? qualificationTypes.get(requirement.relatedQualificationId)
        : undefined;
      return {
        requirementId: requirement.id,
        requirementName: requirement.name,
        requirementCategory: requirement.category,
        jobLevel: e.requirementLevel,
        userStatus: statusMap.get(requirement.id)?.status ?? "UNKNOWN",
        // 값이 없으면 키 자체를 넣지 않는다(exactOptionalPropertyTypes).
        ...(qualificationType ? { qualificationType } : {}),
      } satisfies JobRequirementComparisonItem;
    })
    .filter((x): x is JobRequirementComparisonItem => Boolean(x))
    .sort((a, b) => STATUS_ORDER[a.userStatus] - STATUS_ORDER[b.userStatus]);
}
