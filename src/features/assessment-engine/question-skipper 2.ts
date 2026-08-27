import type { AssessmentQuestion, CareerProfile } from "@/types";

/**
 * 이미 취업 프로필에 있는 정보는 다시 묻지 않는다.
 *
 * 문항은 profileField로 "이 답이 프로필의 어느 칸인가"를 선언한다. 그 칸이 이미 채워져 있으면
 * 같은 걸 또 묻는 셈이므로 건너뛴다.
 *
 * 단, 답이 프로필 값 외에 점수·태그까지 만드는 문항은 건너뛰지 않는다. 건너뛰면 그만큼
 * Dimension Score나 매칭 태그가 비어 결과가 조용히 나빠진다. 예를 들어 "운전 가능"은
 * canDrive를 채우면서 옵션 scoreMap으로 점수에도 기여하고, "교육 의향"은 scoringDimension을
 * 가진다. 이런 문항은 프로필을 알고 있어도 물어야 한다.
 */
function contributesBeyondProfile(question: AssessmentQuestion): boolean {
  if (question.scoringDimension) return true;
  return Boolean(question.options?.some((o) => o.scoreMap || o.tags?.length));
}

/** profileField에 대응하는 값이 프로필에 실제로 들어있는지. profile-extractor의 매핑과 짝을 이룬다. */
function isKnown(profile: CareerProfile, field: string): boolean {
  switch (field) {
    case "desiredSalaryRange":
      return profile.desiredSalaryMin !== undefined || profile.desiredSalaryMax !== undefined;
    case "desiredWorkTypes":
      return (profile.desiredWorkTypes?.length ?? 0) > 0;
    case "heldQualifications":
      return (profile.heldQualifications?.length ?? 0) > 0;
    case "desiredJobCategories":
      return (profile.desiredJobCategories?.length ?? 0) > 0;
    default: {
      const value = (profile as unknown as Record<string, unknown>)[field];
      return value !== undefined && value !== null && value !== "";
    }
  }
}

export interface QuestionSelection {
  /** 실제로 물어볼 문항 */
  asked: AssessmentQuestion[];
  /** 프로필에 이미 있어서 건너뛴 문항 */
  skipped: AssessmentQuestion[];
}

export function selectQuestionsToAsk(
  questions: AssessmentQuestion[],
  profile: CareerProfile | null | undefined,
): QuestionSelection {
  if (!profile) return { asked: questions, skipped: [] };

  const asked: AssessmentQuestion[] = [];
  const skipped: AssessmentQuestion[] = [];
  for (const question of questions) {
    const skippable =
      Boolean(question.profileField) &&
      !contributesBeyondProfile(question) &&
      isKnown(profile, question.profileField as string);
    (skippable ? skipped : asked).push(question);
  }

  // 전부 건너뛰어 물어볼 게 없어지는 상황은 만들지 않는다 (검사 자체가 성립하지 않는다).
  if (asked.length === 0) return { asked: questions, skipped: [] };
  return { asked, skipped };
}
