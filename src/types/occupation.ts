import type { AgeGroup, ISODateString, PublishStatus, Region, Tag, WorkType } from "./common";

/**
 * Occupation: 추천 대상이 되는 "직업/직종" 마스터 도메인.
 *
 * JobRoleSummary(홈페이지 인기직업)와는 별개로, Assessment Engine이
 * 적합도를 계산하는 기준 단위다. jobCategoryCode로 Job/JobRoleSummary와 연결해
 * 관련 채용공고/평균연봉 등을 함께 노출할 수 있다.
 */
export interface Occupation {
  id: string;
  name: string;
  category?: string;
  description: string;
  isMidcareerFriendly: boolean;
  status: PublishStatus;
  tags: Tag[];
  /** Content Catalog와 연결 (자격/교육과정 등) */
  relatedContentIds: string[];
  /** 필요/우대 자격 (자유 문자열 - Content.id 또는 자격명) */
  requiredQualifications: string[];
  recommendedAgeGroups?: AgeGroup[];
  preferredEmploymentTypes?: WorkType[];
  preferredRegions?: Region[];
  /** Job/JobRoleSummary.jobCategory 와 매칭되는 코드 (채용공고 연결용) */
  jobCategoryCode?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type OccupationInput = Partial<Omit<Occupation, "id" | "createdAt" | "updatedAt">> & {
  name: string;
};

/**
 * Occupation Matching Dimension.
 * 절대 직업명을 코드에 하드코딩하지 않기 위해, 모든 추천 로직은
 * 이 Dimension 점수(0~5 스케일 정규화)에 대해서만 동작한다.
 */
export type OccupationDimension =
  | "people_interaction"
  | "care_orientation"
  | "administrative_skill"
  | "physical_activity"
  | "driving"
  | "computer_skill"
  | "stress_response"
  | "teamwork"
  | "schedule_flexibility"
  | "education_willingness"
  | "teaching_orientation"
  | "aesthetic_skill";

export const OCCUPATION_DIMENSIONS: { key: OccupationDimension; label: string }[] = [
  { key: "people_interaction", label: "대인업무 적합도" },
  { key: "care_orientation", label: "돌봄/케어 수용도" },
  { key: "administrative_skill", label: "행정/문서업무 적합도" },
  { key: "physical_activity", label: "신체활동 가능도" },
  { key: "driving", label: "운전 가능도" },
  { key: "computer_skill", label: "컴퓨터 활용능력" },
  { key: "stress_response", label: "돌발상황 대응력" },
  { key: "teamwork", label: "협업 지향성" },
  { key: "schedule_flexibility", label: "근무시간 유연성" },
  { key: "education_willingness", label: "교육/자격 준비 의향" },
  { key: "teaching_orientation", label: "가르침·지도 성향" },
  { key: "aesthetic_skill", label: "손기술·미적 감각" },
];

/**
 * 직업별 추천 기준(Occupation Matching Profile).
 * Dimension 값과의 목표치(targetValue, 0~5) 및 가중치를 관리자가 자유롭게 설정할 수 있다.
 * 새 직업을 추가할 때 코드를 수정할 필요 없이 이 rule들만 추가하면 추천 엔진이 즉시 반영한다.
 */
export interface OccupationMatchingRule {
  id: string;
  occupationId: string;
  dimension: OccupationDimension | (string & {});
  /** 0~5 스케일의 목표(선호) 값 */
  targetValue: number;
  /** 이 Dimension이 총점에 반영되는 가중치 */
  weight: number;
  /** true면 이 Dimension 최소 기준 미달 시 감점/제외 후보로 처리 */
  isRequired?: boolean;
  metadata?: Record<string, unknown>;
}

export type OccupationMatchingRuleInput = Partial<Omit<OccupationMatchingRule, "id">> & {
  occupationId: string;
  dimension: string;
};

/** 직업별 조건(연령/근무형태/지역 등)은 Occupation 필드 자체로 표현하고, 아래는 진입가능성 계산에 쓰이는 참고 메타. */
export interface OccupationConditionFit {
  ageMatch: boolean;
  employmentTypeMatch: boolean;
  regionMatch: boolean;
}
