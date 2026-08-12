import type { AssessmentAnswerRecord, AssessmentQuestion } from "@/types";
import { getSelectedOption } from "./answer-lookup";

/**
 * Dimension Score 계산.
 *
 * 원리: 각 문항은 (Dimension, 0~5 스케일 값) 기여를 만들 수 있다.
 *  - SCALE 문항: rawValue(1~5)가 question.scoringDimension에 그대로 기여한다.
 *  - SINGLE 문항: 선택된 옵션의 scoreMap이 각 Dimension에 기여한다.
 * 여러 문항이 같은 Dimension에 기여하면 평균을 낸다.
 * 최종적으로 0~100 스케일로 정규화한다. 이 함수는 특정 직업명을 전혀 알지 못한다.
 */
export function computeDimensionScores(
  questions: AssessmentQuestion[],
  answers: AssessmentAnswerRecord[],
): Record<string, number> {
  const answersByQuestion = new Map(answers.map((a) => [a.questionId, a]));
  const totals = new Map<string, { sum: number; count: number }>();

  function addContribution(dimension: string, value: number, weight = 1) {
    const entry = totals.get(dimension) ?? { sum: 0, count: 0 };
    entry.sum += value * weight;
    entry.count += weight;
    totals.set(dimension, entry);
  }

  for (const question of questions) {
    const answer = answersByQuestion.get(question.id);
    if (!answer) continue;

    if (question.answerType === "SCALE" && question.scoringDimension) {
      const value = Number(answer.rawValue);
      if (Number.isFinite(value)) {
        addContribution(question.scoringDimension, value);
      }
      continue;
    }

    if (question.answerType === "SINGLE") {
      const option = getSelectedOption(question, answer);
      if (option?.scoreMap) {
        for (const [dimension, value] of Object.entries(option.scoreMap)) {
          if (typeof value === "number") addContribution(dimension, value);
        }
      }
    }
  }

  const scores: Record<string, number> = {};
  for (const [dimension, { sum, count }] of totals.entries()) {
    const average = count > 0 ? sum / count : 0;
    scores[dimension] = Math.round(Math.min(5, Math.max(0, average)) * 20);
  }
  return scores;
}

/** Dimension이 답변되지 않았을 때 사용하는 중립값 (0~100 스케일의 중간값). */
export const NEUTRAL_DIMENSION_SCORE = 50;

export function getDimensionScore(scores: Record<string, number>, dimension: string): number {
  return scores[dimension] ?? NEUTRAL_DIMENSION_SCORE;
}
