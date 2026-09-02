import type {
  AssessmentAnswerRecord,
  AssessmentQuestion,
  CareerProfileInput,
} from "@/types";
import { getSelectedOption, getSelectedOptions } from "./answer-lookup";
import { readCustomQualifications } from "./answer-normalizer";

export interface ExtractedAssessmentSignal {
  /** Career Profile에 반영을 시도할 값들 */
  profile: CareerProfileInput;
  /** 답변 과정에서 수집된 모든 태그 (옵션에 부착된 tags 필드) - Tag 생성/경력활용도 계산에 재사용 */
  answerTags: string[];
}

function resolveRawValue(question: AssessmentQuestion, answer: AssessmentAnswerRecord): unknown {
  switch (question.answerType) {
    case "SINGLE":
      return getSelectedOption(question, answer)?.profileValue;
    case "MULTI":
      return getSelectedOptions(question, answer)
        .map((o) => o.profileValue ?? o.optionText)
        .filter((v) => v !== undefined && v !== null);
    case "QUALIFICATION_MULTI":
      // 고른 선택지 + 직접 적은 자격. 둘 다 보유 자격 이름으로 올라간다.
      return [
        ...getSelectedOptions(question, answer)
          .map((o) => o.profileValue ?? o.optionText)
          .filter((v) => v !== undefined && v !== null),
        ...readCustomQualifications(answer.rawValue),
      ];
    default:
      return answer.rawValue;
  }
}

/**
 * 답변 -> CareerProfile 반영 후보값 추출.
 * profileField 값(문자열 키)에 따라 어떤 CareerProfile 필드에 매핑할지 결정한다.
 * 새 질문을 추가할 때도 profileField만 지정하면 되고 이 함수를 수정할 필요는 없다 (일부 특수 키 제외).
 */
export function extractProfileSignal(
  questions: AssessmentQuestion[],
  answers: AssessmentAnswerRecord[],
): ExtractedAssessmentSignal {
  const answersByQuestion = new Map(answers.map((a) => [a.questionId, a]));
  const profile: CareerProfileInput = {};
  const answerTags = new Set<string>();

  for (const question of questions) {
    const answer = answersByQuestion.get(question.id);
    if (!answer) continue;

    // 옵션에 부착된 태그는 profileField 여부와 무관하게 모두 수집한다.
    if (question.answerType === "SINGLE") {
      getSelectedOption(question, answer)?.tags?.forEach((t) => answerTags.add(t));
    } else if (question.answerType === "MULTI" || question.answerType === "QUALIFICATION_MULTI") {
      getSelectedOptions(question, answer).forEach((o) => o.tags?.forEach((t) => answerTags.add(t)));
    }

    if (!question.profileField) continue;
    const value = resolveRawValue(question, answer);
    if (value === undefined || value === null) continue;

    switch (question.profileField) {
      case "desiredSalaryRange": {
        const range = value as { min?: number; max?: number };
        if (typeof range.min === "number") profile.desiredSalaryMin = range.min;
        if (typeof range.max === "number") profile.desiredSalaryMax = range.max;
        break;
      }
      case "region": {
        const region = value as { sido?: string };
        if (region?.sido) profile.region = region.sido as CareerProfileInput["region"];
        break;
      }
      case "desiredWorkTypes": {
        const workType = value as NonNullable<CareerProfileInput["desiredWorkTypes"]>[number];
        profile.desiredWorkTypes = [workType];
        break;
      }
      case "isOpenToTraining": {
        profile.isOpenToTraining = Number(value) >= 4;
        break;
      }
      case "heldQualifications": {
        profile.heldQualifications = value as string[];
        break;
      }
      case "careerYears":
      case "careerBreakMonths": {
        (profile as Record<string, unknown>)[question.profileField] = Number(value);
        break;
      }
      default: {
        (profile as Record<string, unknown>)[question.profileField] = value;
      }
    }
  }

  return { profile, answerTags: [...answerTags] };
}
