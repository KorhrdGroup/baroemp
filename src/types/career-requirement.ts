import type { ISODateString, Tag } from "./common";

/** 최소 Requirement Type (STEP 7.5 스펙 6번). 필요하면 관리자가 확장 가능하도록 열어둔다. */
export type RequirementCategory =
  | "QUALIFICATION"
  | "SKILL"
  | "EXPERIENCE"
  | "DRIVING"
  | "EDUCATION"
  | "COMPUTER"
  | "EMPLOYMENT_TYPE"
  | "WORK_SCHEDULE"
  | "LANGUAGE"
  | "PHYSICAL"
  | "OTHER"
  | (string & {});

/**
 * 사용자 Career DB에서 이 Requirement의 충족 상태를 어떻게 계산할지를 결정하는 방식.
 * AI가 임의 판단하지 않고 Rule Engine이 결정론적으로 계산하기 위한 분기 키다 (스펙 49번).
 */
export type RequirementMatchingType = "DRIVING_FLAG" | "QUALIFICATION" | "SKILL_KEYWORD" | "EXPERIENCE_TEXT" | (string & {});

export type PreparationDifficulty = "LOW" | "MEDIUM" | "HIGH";

/**
 * Career Requirement Master (스펙 9번).
 * "운전 가능자/차량운전 가능/운전면허 소지자 우대" 같은 다른 표현을 하나의 canonical requirement로
 * 묶기 위한 사전(Requirement Normalizer 사전) 역할을 겸한다. detectionKeywords가 곧 Normalizer 규칙이다.
 */
export interface CareerGapRequirement {
  id: string;
  key: string;
  name: string;
  category: RequirementCategory;
  description?: string;
  matchingType: RequirementMatchingType;
  relatedQualificationId?: string;
  relatedSkillId?: string;
  relatedContentTags: Tag[];
  /** Job 원문 및 사용자 Resume 텍스트에서 이 조건을 탐지하기 위한 키워드 (Normalizer 규칙) */
  detectionKeywords: string[];
  preparationDifficulty: PreparationDifficulty;
  status: "active" | "inactive";
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type CareerGapRequirementInput = Partial<Omit<CareerGapRequirement, "id" | "createdAt" | "updatedAt">> & {
  key: string;
  name: string;
  category: RequirementCategory;
};

export type CareerGapRequirementFilter = { category?: RequirementCategory; status?: CareerGapRequirement["status"] };
