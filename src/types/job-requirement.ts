import type { ISODateString } from "./common";

/** REQUIRED(필수) / PREFERRED(우대) / MENTIONED(단순 언급) - 스펙 7번 */
export type RequirementLevel = "REQUIRED" | "PREFERRED" | "MENTIONED";

/**
 * Job Requirement: 개별 채용공고에서 추출된 표준화 요구조건 (스펙 7번).
 * jobs.requirements/qualification_requirements/description/tags 등 원문 필드를 Rule/Keyword 기반으로
 * 분석해 career_requirements의 canonical key로 정규화한 결과다.
 */
export interface JobRequirement {
  id: string;
  jobId: string;
  requirementId: string;
  requirementLevel: RequirementLevel;
  sourceText?: string;
  confidence: number;
  createdAt: ISODateString;
}

export type JobRequirementInput = Omit<JobRequirement, "id" | "createdAt">;

export type JobRequirementFilter = { jobId?: string; requirementId?: string };
