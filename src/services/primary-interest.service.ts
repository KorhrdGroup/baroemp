import type { AssessmentResult, CareerProfile, Consultation, UserJobInterest } from "@/types";

export type PrimaryInterestSource = "JOB_BEHAVIOR" | "ASSESSMENT" | "MANUAL" | "CONSULTATION";

export interface PrimaryInterestResult {
  label: string;
  source: PrimaryInterestSource;
  occupationId?: string;
  score?: number;
}

/**
 * leads.primary_interest 결정 정책.
 *
 * 우선순위:
 * 1. 최근 Job Behavior (source=JOB_BEHAVIOR 관심도 중 최고점, 신뢰 가능한 최소 점수 이상)
 * 2. Assessment TOP 추천 직업
 * 3. Manual Interest (career_profile.desiredJobCategories 또는 source=MANUAL 관심도)
 * 4. 상담 이력 (직업 신호가 전혀 없을 때의 최후 fallback)
 *
 * 코드 배포 없이 정책을 바꿀 수 있도록 이 함수 하나에만 우선순위 로직을 모아둔다.
 * 반환값의 source를 leads.score_breakdown 또는 admin UI에 노출해 "왜 이 관심사가 선택되었는지"를
 * 확인할 수 있게 한다.
 */
export function resolvePrimaryInterest(params: {
  jobInterests: UserJobInterest[];
  latestAssessmentResult?: AssessmentResult;
  careerProfile?: CareerProfile;
  consultations?: Consultation[];
}): PrimaryInterestResult | null {
  const { jobInterests, latestAssessmentResult, careerProfile, consultations = [] } = params;

  const MIN_JOB_BEHAVIOR_SCORE = 10;
  const topJobBehavior = [...jobInterests]
    .filter((i) => i.source === "JOB_BEHAVIOR")
    .sort((a, b) => b.interestScore - a.interestScore)[0];
  if (topJobBehavior && topJobBehavior.interestScore >= MIN_JOB_BEHAVIOR_SCORE) {
    return {
      label: topJobBehavior.occupationName,
      source: "JOB_BEHAVIOR",
      occupationId: topJobBehavior.occupationId,
      score: topJobBehavior.interestScore,
    };
  }

  const topRecommendation = [...(latestAssessmentResult?.recommendations ?? [])].sort(
    (a, b) => b.totalScore - a.totalScore,
  )[0];
  if (topRecommendation) {
    return {
      label: topRecommendation.occupationName,
      source: "ASSESSMENT",
      occupationId: topRecommendation.occupationId,
      score: topRecommendation.totalScore,
    };
  }

  const manualInterest = [...jobInterests].filter((i) => i.source === "MANUAL").sort((a, b) => b.interestScore - a.interestScore)[0];
  if (manualInterest) {
    return { label: manualInterest.occupationName, source: "MANUAL", occupationId: manualInterest.occupationId, score: manualInterest.interestScore };
  }
  if (careerProfile?.desiredJobCategories && careerProfile.desiredJobCategories.length > 0) {
    return { label: careerProfile.desiredJobCategories[0], source: "MANUAL" };
  }

  if (consultations.length > 0) {
    return { label: "상담 문의 이력 있음", source: "CONSULTATION" };
  }

  return null;
}
