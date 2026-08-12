/**
 * DB content_recommendation_rules 행과 1:1 대응하는 타입.
 * 관리자가 코드 수정 없이 Rule 을 추가/변경할 수 있도록 field/operator/value 구조로 설계한다.
 */
export type RecommendationRuleOperator =
  | "EQ"
  | "IN"
  | "CONTAINS_ANY"
  | "NOT_HAS"
  | "WITHIN_MONTHS"
  | "GTE"
  | "LTE";

export interface ContentRecommendationRuleRow {
  id: string;
  contentId: string;
  field: string;
  operator: RecommendationRuleOperator | (string & {});
  value: unknown;
  weight: number;
  isRequired: boolean;
  status: "active" | "inactive" | (string & {});
}

export type ContentRecommendationRuleInput = Omit<ContentRecommendationRuleRow, "id"> & {
  id?: string;
};
