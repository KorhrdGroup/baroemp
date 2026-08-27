import type {
  AssessmentAnswerRecord,
  AssessmentQuestion,
  CareerContent,
  CareerProfile,
  Occupation,
  OccupationMatchingRule,
  AssessmentResultInput,
} from "@/types";
import { computeDimensionScores } from "./dimension-scorer";
import { extractProfileSignal } from "./profile-extractor";
import { matchOccupations } from "./occupation-matcher";
import { generateAssessmentTags } from "./tag-generator";

export const ENGINE_VERSION = "CAREER_ASSESSMENT_V1";

export interface BuildResultInput {
  sessionId: string;
  assessmentId: string;
  userId?: string;
  anonymousId?: string;
  questions: AssessmentQuestion[];
  answers: AssessmentAnswerRecord[];
  occupations: Occupation[];
  rulesByOccupation: Map<string, OccupationMatchingRule[]>;
  contents: CareerContent[];
  /** 기존 Career Profile (있으면 ageGroup 등 검사에서 얻지 못한 정보를 보완) */
  existingProfile?: CareerProfile;
}

/**
 * Assessment Engine Pipeline 최종 조립.
 * Answers -> Normalize(이미 완료) -> Career Signal 추출 -> Dimension Score -> Occupation Matching -> Result
 */
export function buildAssessmentResult(input: BuildResultInput): AssessmentResultInput {
  const dimensionScores = computeDimensionScores(input.questions, input.answers);
  const { profile: extractedProfile, answerTags } = extractProfileSignal(input.questions, input.answers);

  // 프로필에 이미 있어 묻지 않은 문항(question-skipper)이 있으므로, 매칭에 쓰는 프로필은
  // 기존 값을 바탕에 깔고 이번 답변으로 덮는다. 그러지 않으면 건너뛴 항목이 undefined가 되어
  // 지역·급여 같은 조건이 매칭에서 통째로 빠진다.
  const mergedProfileForMatching = {
    ...input.existingProfile,
    ...Object.fromEntries(Object.entries(extractedProfile).filter(([, v]) => v !== undefined)),
  } as typeof extractedProfile;

  const recommendations = matchOccupations(
    {
      occupations: input.occupations,
      rulesByOccupation: input.rulesByOccupation,
      dimensionScores,
      profile: mergedProfileForMatching,
      answerTags,
      contents: input.contents,
    },
    5,
  );

  const generatedTags = generateAssessmentTags({
    profile: mergedProfileForMatching,
    dimensionScores,
    answerTags,
    ageGroup: input.existingProfile?.ageGroup,
  });

  const top = recommendations[0];
  const summary = top
    ? `${top.occupationName} 등 ${recommendations.length}개 직업이 회원님의 성향·조건과 잘 맞아요. 적합도 ${top.totalScore}점이에요.`
    : "입력하신 답변으로는 추천할 직업을 찾지 못했어요. 조건을 조금 더 넓혀서 다시 시도해보세요.";

  return {
    sessionId: input.sessionId,
    assessmentId: input.assessmentId,
    userId: input.userId,
    anonymousId: input.anonymousId,
    dimensionScores,
    extractedProfile,
    generatedTags,
    recommendations,
    summary,
    engineVersion: ENGINE_VERSION,
  };
}
