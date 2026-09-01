import type { AgeGroup, CareerProfileInput } from "@/types";
import { REGION_LABELS } from "@/lib/labels";
import { getDimensionScore } from "./dimension-scorer";

export interface TagGeneratorInput {
  profile: CareerProfileInput;
  dimensionScores: Record<string, number>;
  /** 옵션에 이미 부착되어 수집된 태그 (예: "3개월내취업", "복지관심") */
  answerTags: string[];
  ageGroup?: AgeGroup;
}

/**
 * 검사 결과 기반 User Tag 자동 생성.
 * 규칙을 이 함수 안에 모아두어, 향후 관리자가 Tag Rule을 조정할 수 있는 지점을 명확히 분리한다.
 */
export function generateAssessmentTags(input: TagGeneratorInput): string[] {
  const { profile, dimensionScores, answerTags, ageGroup } = input;
  const tags = new Set<string>(answerTags);

  const timing = profile.desiredStartTiming;
  if (timing === "immediately" || timing === "within_1_month" || timing === "within_3_months") {
    tags.add("3개월내취업");
  }

  if (
    profile.employmentStatus === "career_break" ||
    profile.employmentStatus === "unemployed" ||
    profile.employmentStatus === "preparing_retirement"
  ) {
    tags.add("재취업");
  }

  if (profile.canDrive) tags.add("운전가능");

  if (profile.isOpenToTraining || getDimensionScore(dimensionScores, "education_willingness") >= 70) {
    tags.add("교육의향높음");
  }

  if (getDimensionScore(dimensionScores, "people_interaction") >= 70) {
    tags.add("대인업무선호");
  }

  if (getDimensionScore(dimensionScores, "care_orientation") >= 70) {
    tags.add("복지관심");
  }

  if (profile.region) {
    const label = REGION_LABELS[profile.region];
    if (label) tags.add(label);
  }

  // V1 검사는 연령 문항이 없으므로, ageGroup이 있으면 그대로 활용하고 없으면 서비스 대상 기준으로 부여한다.
  if (!ageGroup || ["40s", "50s", "60s", "70plus"].includes(ageGroup)) {
    tags.add("중장년");
  }

  /*
   * 저장 표기는 # 없이 통일한다. 공고 태그(jobs.tags)와 행동 기반 승격 태그가 모두
   * '운전배송'처럼 접두사가 없어서, 여기만 '#운전가능'으로 저장하면 관심 태그
   * 가산점(evaluateJobFit)이 영영 발동하지 않는다. #는 화면에서 붙인다.
   */
  return [...tags].map((tag) => tag.replace(/^#/, ""));
}
