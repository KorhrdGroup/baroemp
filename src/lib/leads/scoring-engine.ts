import type { LeadGrade, LeadScoreBreakdown, LeadSignal } from "@/types";
import { LEAD_GRADE_THRESHOLDS, LEAD_SCORING_RULES } from "./scoring-rules";

/**
 * 특정 리드에 대해 어떤 신호가 활성화되어 있는지를 나타내는 입력값.
 * 키는 scoring-rules.ts의 LeadScoringRule.key와 일치해야 한다.
 * 실제 서비스에서는 Activity Event 집계 결과로부터 이 입력을 생성하게 된다.
 */
export type LeadSignalInput = Record<string, boolean>;

function resolveGrade(totalScore: number): LeadGrade {
  const matched = LEAD_GRADE_THRESHOLDS.find((t) => totalScore >= t.minScore);
  return matched?.grade ?? "D";
}

/**
 * Mock Lead Scoring Engine.
 * 규칙 목록(LEAD_SCORING_RULES)을 순회하며 입력값에 따라 점수를 합산한다.
 * 향후 규칙이 추가되어도 이 함수는 수정할 필요가 없다.
 */
export function calculateLeadScore(signalInput: LeadSignalInput): LeadScoreBreakdown {
  const signals: LeadSignal[] = LEAD_SCORING_RULES.map((rule) => {
    const active = Boolean(signalInput[rule.key]);
    return {
      key: rule.key,
      label: rule.label,
      active,
      points: active ? rule.points : 0,
    };
  });

  const totalScore = signals.reduce((sum, signal) => sum + signal.points, 0);

  return {
    totalScore,
    grade: resolveGrade(totalScore),
    signals,
  };
}
