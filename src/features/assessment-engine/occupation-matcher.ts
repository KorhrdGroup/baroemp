import type {
  CareerContent,
  CareerProfileInput,
  Occupation,
  OccupationMatchingRule,
  OccupationRecommendation,
} from "@/types";
import { getDimensionScore } from "./dimension-scorer";

const DIMENSION_REASON_TEMPLATES: Record<string, string> = {
  people_interaction: "사람을 상대하는 업무 선호가 높습니다.",
  care_orientation: "복지·돌봄 업무 수용도가 높습니다.",
  administrative_skill: "문서/행정 업무 처리 능력이 준비되어 있습니다.",
  physical_activity: "신체활동이 필요한 업무에 적합한 편입니다.",
  driving: "운전이 가능해 이동이 필요한 업무에 유리합니다.",
  computer_skill: "컴퓨터 활용 능력이 준비되어 있습니다.",
  stress_response: "예상치 못한 상황 대응에 자신감이 있습니다.",
  teamwork: "협업이 필요한 업무 환경에 잘 맞습니다.",
  schedule_flexibility: "근무시간에 대한 유연성이 높습니다.",
  education_willingness: "자격 취득·교육 의향이 높아 진입 가능성이 있습니다.",
  teaching_orientation: "아이·청소년을 가르치고 지도하는 일에 잘 맞습니다.",
  aesthetic_skill: "손재주와 미적 감각을 살리는 업무에 강점이 있습니다.",
};

const DIMENSION_LABELS: Record<string, string> = {
  people_interaction: "대인업무 적합도",
  care_orientation: "돌봄 수용도",
  administrative_skill: "행정업무 적합도",
  physical_activity: "신체활동 가능도",
  driving: "운전 가능도",
  computer_skill: "컴퓨터 활용능력",
  stress_response: "돌발상황 대응력",
  teamwork: "협업 지향성",
  schedule_flexibility: "근무시간 유연성",
  education_willingness: "교육 준비 의향",
  teaching_orientation: "가르침·지도 성향",
  aesthetic_skill: "손기술·미적 감각",
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function toGrade(totalScore: number): OccupationRecommendation["grade"] {
  if (totalScore >= 85) return "매우 잘 맞아요";
  if (totalScore >= 70) return "잘 맞아요";
  if (totalScore >= 55) return "도전해볼 만해요";
  return "준비가 더 필요해요";
}

function contentBoost(content?: CareerContent): number {
  if (!content) return 6;
  if (content.type === "LICENSE" || content.type === "PRIVATE_CERTIFICATE") return 30;
  if (content.type === "JOB_TRAINING") return 14;
  if (content.type === "ONLINE_COURSE") return 10;
  return 6;
}

export interface OccupationMatchInput {
  occupations: Occupation[];
  rulesByOccupation: Map<string, OccupationMatchingRule[]>;
  dimensionScores: Record<string, number>;
  profile: CareerProfileInput;
  /** 답변에서 수집된 경력/성향 태그 (경력활용도 계산에 사용) */
  answerTags: string[];
  contents: CareerContent[];
}

/**
 * 직업 매칭 엔진.
 *
 * 중요: 이 함수는 어떤 직업명도 알지 못한다. 오직 occupation.tags/requiredQualifications/
 * preferred* 필드와 occupationMatchingRules(Dimension 기준)만으로 점수를 계산한다.
 * 새로운 직업을 추가하려면 Occupation + OccupationMatchingRule 데이터만 추가하면 되고
 * 이 파일은 절대 수정할 필요가 없다.
 */
export function matchOccupations(input: OccupationMatchInput, limit = 5): OccupationRecommendation[] {
  const { occupations, rulesByOccupation, dimensionScores, profile, answerTags, contents } = input;
  const contentById = new Map(contents.map((c) => [c.id, c]));
  const heldQualifications = profile.heldQualifications ?? [];

  const results: OccupationRecommendation[] = [];

  for (const occupation of occupations) {
    if (occupation.status !== "published") continue;
    const rules = rulesByOccupation.get(occupation.id) ?? [];
    if (rules.length === 0) continue;

    let weightedFitSum = 0;
    let weightSum = 0;
    let requiredPenalty = 0;
    const strongDimensions: { dimension: string; fit: number; weight: number }[] = [];
    const weakRequiredDimensions: string[] = [];

    for (const rule of rules) {
      const actual = getDimensionScore(dimensionScores, rule.dimension);
      const target = clamp(rule.targetValue * 20);
      const fit = clamp(100 - Math.abs(actual - target));
      weightedFitSum += fit * rule.weight;
      weightSum += rule.weight;
      strongDimensions.push({ dimension: rule.dimension, fit, weight: rule.weight });
      if (rule.isRequired && actual < target - 25) {
        requiredPenalty += 15;
        weakRequiredDimensions.push(rule.dimension);
      }
    }

    const dimensionFitScore = clamp(weightSum > 0 ? weightedFitSum / weightSum : 50);

    // 근무조건 적합도: 연령/근무형태/지역 조건이 정의된 경우에만 평가하고, 없으면 만점 처리한다.
    const conditionChecks: number[] = [];
    if (occupation.recommendedAgeGroups?.length && profile.ageGroup) {
      conditionChecks.push(occupation.recommendedAgeGroups.includes(profile.ageGroup) ? 100 : 45);
    }
    if (occupation.preferredEmploymentTypes?.length && profile.desiredWorkTypes?.length) {
      const overlap = profile.desiredWorkTypes.some((w) => occupation.preferredEmploymentTypes?.includes(w));
      conditionChecks.push(overlap ? 100 : 55);
    }
    if (occupation.preferredRegions?.length && profile.region) {
      conditionChecks.push(occupation.preferredRegions.includes(profile.region) ? 100 : 70);
    }
    const conditionFitScore =
      conditionChecks.length > 0
        ? clamp(conditionChecks.reduce((a, b) => a + b, 0) / conditionChecks.length)
        : 85;

    // 진입 가능성: 필요자격 보유 여부 + 교육의향
    const hasRequiredQualification =
      occupation.requiredQualifications.length === 0 ||
      occupation.requiredQualifications.some((req) =>
        heldQualifications.some((held) => req.includes(held) || held.includes(req)),
      );
    const educationScore = getDimensionScore(dimensionScores, "education_willingness");
    let entryFeasibilityScore: number;
    if (occupation.requiredQualifications.length === 0) {
      entryFeasibilityScore = 85;
    } else if (hasRequiredQualification) {
      entryFeasibilityScore = 92;
    } else {
      entryFeasibilityScore = clamp(28 + educationScore * 0.5);
    }

    // 경력 활용도: 경력 태그 중첩 + 경력연수
    const tagOverlap = occupation.tags.filter((tag) => answerTags.includes(tag)).length;
    const careerYearsBonus = Math.min(profile.careerYears ?? 0, 10) * 2;
    const experienceUtilizationScore = clamp(40 + tagOverlap * 18 + careerYearsBonus);

    const rawTotal =
      dimensionFitScore * 0.45 +
      conditionFitScore * 0.2 +
      entryFeasibilityScore * 0.15 +
      experienceUtilizationScore * 0.2 -
      requiredPenalty;
    const totalScore = Math.round(clamp(rawTotal));

    const readinessScore = Math.round(
      clamp(
        (hasRequiredQualification ? 45 : 12) +
          dimensionFitScore * 0.22 +
          experienceUtilizationScore * 0.13 +
          educationScore * 0.15,
      ),
    );

    const reasons: string[] = [];
    const sortedStrong = [...strongDimensions].sort((a, b) => b.weight * b.fit - a.weight * a.fit);
    for (const { dimension, fit, weight } of sortedStrong) {
      if (fit >= 78 && weight >= 2 && reasons.length < 3) {
        const template = DIMENSION_REASON_TEMPLATES[dimension];
        if (template) reasons.push(template);
      }
    }
    if (hasRequiredQualification && occupation.requiredQualifications.length > 0) {
      reasons.push("필요한 자격을 이미 보유하고 있습니다.");
    } else if (educationScore >= 70 && occupation.requiredQualifications.length > 0) {
      reasons.push("자격 취득 의향이 높아 진입 가능성이 있습니다.");
    }
    if (reasons.length === 0) {
      reasons.push("전반적인 성향과 근무조건이 이 직업과 무난하게 맞는 편입니다.");
    }

    const risks: string[] = [];
    if (!hasRequiredQualification && occupation.requiredQualifications.length > 0) {
      risks.push("현재 관련 자격을 보유하지 않았습니다.");
    }
    for (const dimension of weakRequiredDimensions) {
      const label = DIMENSION_LABELS[dimension];
      if (label) risks.push(`${label} 보완이 필요할 수 있습니다.`);
    }

    const missingConditions = occupation.requiredQualifications.filter(
      (req) => !heldQualifications.some((held) => req.includes(held) || held.includes(req)),
    );

    const recommendedContentIds = occupation.relatedContentIds.filter((id) => contentById.has(id));
    const readinessProjection = recommendedContentIds
      .map((contentId) => {
        const content = contentById.get(contentId);
        return {
          contentId,
          contentTitle: content?.title ?? contentId,
          projectedScore: Math.round(clamp(readinessScore + contentBoost(content), 0, 96)),
        };
      })
      .sort((a, b) => b.projectedScore - a.projectedScore)
      .slice(0, 2);

    results.push({
      occupationId: occupation.id,
      occupationName: occupation.name,
      occupationCategory: occupation.category,
      jobCategoryCode: occupation.jobCategoryCode,
      totalScore,
      dimensionFitScore: Math.round(dimensionFitScore),
      conditionFitScore: Math.round(conditionFitScore),
      entryFeasibilityScore: Math.round(entryFeasibilityScore),
      experienceUtilizationScore: Math.round(experienceUtilizationScore),
      readinessScore,
      grade: toGrade(totalScore),
      reasons,
      risks,
      missingConditions,
      requiredQualifications: occupation.requiredQualifications,
      recommendedContentIds,
      readinessProjection,
    });
  }

  return results.sort((a, b) => b.totalScore - a.totalScore).slice(0, limit);
}
