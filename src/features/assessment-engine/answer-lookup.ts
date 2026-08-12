import type { AssessmentAnswerRecord, AssessmentOption, AssessmentQuestion } from "@/types";

export function getSelectedOption(
  question: AssessmentQuestion,
  answer: AssessmentAnswerRecord | undefined,
): AssessmentOption | undefined {
  if (!answer?.optionId) return undefined;
  return question.options?.find((o) => o.id === answer.optionId);
}

export function getSelectedOptions(
  question: AssessmentQuestion,
  answer: AssessmentAnswerRecord | undefined,
): AssessmentOption[] {
  if (!answer?.optionIds?.length) return [];
  const ids = new Set(answer.optionIds);
  return (question.options ?? []).filter((o) => ids.has(o.id));
}
