import type { SupportProgramInput } from "@/types";
import type { NormalizedSupportProgram } from "./types";

/**
 * NormalizedSupportProgram(Provider Adapter 출력) -> SupportProgramInput(내부 support_programs
 * 테이블 upsert 입력) 변환. Support Sync Service는 이 함수를 거친 값만
 * SupportProgramRepository.upsertExternal()에 전달한다 (jobs의 to-job-input.ts와 동일한 철학).
 */
export function normalizedSupportToSupportInput(
  program: NormalizedSupportProgram,
): SupportProgramInput & { externalSource: string; externalId: string } {
  return {
    externalSource: program.externalSource,
    externalId: program.externalId,
    title: program.title,
    organization: program.organizationName,
    organizationName: program.organizationName,
    departmentName: program.departmentName,
    summary: program.summary ?? program.title,
    description: program.description ?? program.summary ?? program.title,
    category: program.category ?? "other",
    audience: program.audience ?? "personal",
    supportType: program.supportType ?? "other",
    targetDescription: program.targetDescription,
    targetAgeGroups: program.targetAgeGroups ?? [],
    targetAgeMin: program.targetAgeMin,
    targetAgeMax: program.targetAgeMax,
    targetConditions: program.targetDescription ? [program.targetDescription] : [],
    regionScope: program.regionScope,
    employmentStatusTargets: program.employmentStatusTargets ?? [],
    incomeCondition: program.incomeCondition,
    careerCondition: program.careerCondition,
    householdCondition: program.householdCondition,
    educationCondition: program.educationCondition,
    jobCondition: program.jobCondition,
    eligibilityRaw: program.eligibilityRaw,
    benefitDescription: program.benefitDescription,
    supportAmountText: program.supportAmountText,
    applicationPeriod: program.applicationPeriod,
    applicationStartAt: program.applicationStartAt,
    applicationEndAt: program.applicationEndAt,
    applicationMethod: program.applicationMethod,
    requiredDocuments: program.requiredDocuments ?? [],
    contact: program.contact,
    tags: program.tags ?? [],
    relatedJobCategories: program.relatedJobCategories ?? [],
    relatedQualificationCodes: program.relatedQualificationCodes ?? [],
    applyUrl: program.sourceUrl,
    sourceUrl: program.sourceUrl,
    status: "published",
    isActive: program.isActive,
    rawPayload: program.rawPayload,
    fetchedAt: program.fetchedAt,
    careerRelevanceScore: program.careerRelevanceScore ?? 0,
    careerRelevanceReasons: program.careerRelevanceReasons ?? [],
  };
}
