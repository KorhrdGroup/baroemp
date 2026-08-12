import { extractTagsFromText } from "@/lib/jobs/job-tag-rules";
import type { JobInput, WorkType } from "@/types";
import type { NormalizedJob } from "./types";

/**
 * NormalizedJob(Provider Adapter 출력) -> JobInput(내부 jobs 테이블 upsert 입력) 변환.
 *
 * Job Sync Service는 이 함수를 거친 값만 JobRepository.upsertExternal()에 전달한다.
 * Provider 고유 필드명은 이 지점 이전(work24-provider.ts의 adaptWork24Entry)에서 이미
 * NormalizedJob으로 정규화되어 있으므로, 여기서는 외부 API 구조를 전혀 알지 못해도 된다.
 */
export function normalizedJobToJobInput(job: NormalizedJob): JobInput & { externalSource: string; externalId: string } {
  const tags = extractTagsFromText(`${job.title} ${job.description ?? ""}`);

  return {
    externalSource: job.externalSource,
    externalId: job.externalId,
    title: job.title,
    companyName: job.companyName,
    businessRegistrationNumber: job.businessRegistrationNumber,
    industryName: job.industryName,
    description: job.description ?? job.title,
    jobCategory: job.jobCategory ?? job.occupationCode ?? "other",
    occupationCode: job.occupationCode,
    occupationName: job.occupationName,
    region: job.regionSido ?? "seoul",
    regionSigungu: job.regionSigungu,
    address: job.address,
    zipCode: job.zipCode,
    workType: (job.employmentType ?? "full_time") as WorkType,
    employmentTypeCode: job.employmentTypeCode,
    salaryType: job.salaryType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryText: job.salaryText,
    isBeginnerFriendly: job.careerRequirement === "new" || job.careerRequirement === "any",
    careerRequirement: job.careerRequirement,
    educationRequirement: job.educationRequirement,
    preferentialCodes: job.preferentialCodes ?? [],
    recommendedAgeGroups: job.recommendedAgeGroups,
    workHours: job.workHours,
    workDays: job.workDays,
    preferredQualifications: [],
    qualificationRequirements: job.qualificationRequirements,
    tags,
    applyDeadline: job.applyDeadline,
    postedAt: job.postedAt,
    sourceUpdatedAt: job.sourceUpdatedAt,
    status: "published",
    isActive: job.isActive,
    source: job.externalSource === "mock" ? "direct" : "public_job_board",
    sourceUrl: job.sourceUrl,
    mobileSourceUrl: job.mobileSourceUrl,
    rawPayload: job.rawPayload,
    fetchedAt: job.fetchedAt,
  };
}
