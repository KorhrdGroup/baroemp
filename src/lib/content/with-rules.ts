import type { CareerContent, ContentRecommendationRuleRow } from "@/types";
import { mockContentRecommendationRules } from "@/mocks/content-rules.mock";

export function attachRecommendationRules(
  content: CareerContent,
  rules: ContentRecommendationRuleRow[] = mockContentRecommendationRules,
): CareerContent {
  return {
    ...content,
    recommendationRuleRows: rules.filter((r) => r.contentId === content.id && r.status === "active"),
  };
}

export function attachRecommendationRulesToAll(
  contents: CareerContent[],
  rules: ContentRecommendationRuleRow[] = mockContentRecommendationRules,
): CareerContent[] {
  return contents.map((c) => attachRecommendationRules(c, rules));
}
