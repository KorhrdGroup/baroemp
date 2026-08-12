import type { ISODateString } from "./common";

/**
 * Eligibility Rule Engine의 핵심 도메인.
 *
 * 지원제도마다 대상조건을 구조화된 Rule로 관리할 수 있게 한다. 단, 외부 API가 자연어
 * 대상조건만 제공할 수 있으므로 SupportProgram.eligibilityRaw(원문)는 항상 별도로 보관하고,
 * 이 Rule은 "가능하면 구조화해서 자동 판정에 활용"하는 보조 장치로 취급한다.
 */
export type SupportRuleField =
  | "age"
  | "region"
  | "employment_status"
  | "career_break"
  | "training_willingness"
  | "desired_job_category"
  | "income_condition"
  | "household_condition"
  | "education_condition"
  | (string & {});

export type SupportRuleOperator =
  | "EQ"
  | "IN"
  | "BETWEEN"
  | "GTE"
  | "LTE"
  | "EXISTS"
  | (string & {});

/** structured: 자동 판정 가능한 구조화 규칙 / raw: 자연어 원문만 존재해 자동판정 불가(항상 CHECK_REQUIRED 사유가 됨) */
export type SupportRuleType = "structured" | "raw";

export interface SupportProgramRule {
  id: string;
  supportProgramId: string;
  field: SupportRuleField;
  operator: SupportRuleOperator;
  /** EQ: 단일값 / IN: 배열 / BETWEEN: [min,max] / GTE·LTE: 단일 숫자 / EXISTS: true */
  value: unknown;
  /** 이 조건이 매칭 점수에 반영되는 가중치 */
  weight: number;
  /** true면 이 조건 미충족 시 등급을 LOW로 강하게 낮춘다(필수조건). */
  isRequired: boolean;
  ruleType: SupportRuleType;
  status: "active" | "inactive";
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type SupportProgramRuleInput = Partial<Omit<SupportProgramRule, "id" | "createdAt" | "updatedAt">> & {
  supportProgramId: string;
  field: SupportRuleField;
  operator: SupportRuleOperator;
};
