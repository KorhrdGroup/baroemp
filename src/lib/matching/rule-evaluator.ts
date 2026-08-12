import type { CareerProfile } from "@/types";
import type { ContentRecommendationRuleRow } from "@/types";
import type { MatchReasonDetail } from "@/types";

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function monthsUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return months;
}

/**
 * DB Rule 행을 CareerProfile 에 대해 평가한다.
 * 규칙이 하드코딩되지 않도록 field/operator 만 해석한다.
 */
export function evaluateRecommendationRuleRow(
  profile: CareerProfile,
  rule: ContentRecommendationRuleRow,
): MatchReasonDetail | null {
  if (rule.status !== "active") return null;

  const field = rule.field;
  const op = rule.operator;
  const weight = rule.weight || 10;
  let matched = false;
  let label = `${field} ${op}`;

  switch (field) {
    case "age_group": {
      const values = asArray(rule.value).map(String);
      matched = Boolean(profile.ageGroup && values.includes(profile.ageGroup));
      label = "연령대 조건";
      break;
    }
    case "tags": {
      const values = asArray(rule.value).map(String);
      const tags = profile.interestTags ?? [];
      matched =
        op === "CONTAINS_ANY"
          ? values.some((v) => tags.includes(v))
          : values.every((v) => tags.includes(v));
      label = "관심 태그 조건";
      break;
    }
    case "can_drive": {
      matched = Boolean(profile.canDrive) === Boolean(rule.value);
      label = "운전 가능 여부";
      break;
    }
    case "desired_employment_date":
    case "desired_start_timing": {
      if (op === "WITHIN_MONTHS") {
        const months = Number(rule.value);
        const timing = profile.desiredStartTiming;
        matched =
          timing === "immediately" ||
          timing === "within_1_month" ||
          (months >= 3 && timing === "within_3_months") ||
          (months >= 6 && timing === "within_6_months");
        if (!matched && profile.desiredStartTiming) {
          // desiredEmploymentDate 가 ISO 로 들어오면 monthsUntil 사용 (확장 필드)
          const until = monthsUntil((profile as { desiredEmploymentDate?: string }).desiredEmploymentDate);
          matched = until !== null && until <= months;
        }
        label = `${months}개월 이내 취업 희망`;
      }
      break;
    }
    case "qualification": {
      const held = profile.heldQualifications ?? [];
      const value = String(Array.isArray(rule.value) ? rule.value[0] : rule.value);
      if (op === "NOT_HAS") {
        matched = !held.includes(value);
        label = "자격 미보유";
      } else {
        matched = held.includes(value);
        label = "자격 보유";
      }
      break;
    }
    case "region":
    case "preferred_region": {
      const values = asArray(rule.value).map(String);
      matched = Boolean(profile.region && values.includes(profile.region));
      label = "지역 조건";
      break;
    }
    case "job_category":
    case "desired_job_categories": {
      const values = asArray(rule.value).map(String);
      const cats = profile.desiredJobCategories ?? [];
      matched = values.some((v) => cats.includes(v));
      label = "희망 직종 조건";
      break;
    }
    default: {
      // 알 수 없는 필드는 무시 (확장 시 엔진 수정 최소화)
      return null;
    }
  }

  if (!matched) {
    if (rule.isRequired) {
      return { ruleKey: field, label: `${label} (필수 미충족)`, score: -100 };
    }
    return null;
  }

  return { ruleKey: field, label, score: weight };
}

export function evaluateRecommendationRuleRows(
  profile: CareerProfile,
  rows: ContentRecommendationRuleRow[] = [],
): MatchReasonDetail[] {
  return rows
    .map((row) => evaluateRecommendationRuleRow(profile, row))
    .filter((r): r is MatchReasonDetail => r !== null);
}
