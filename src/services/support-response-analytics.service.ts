import { getSupportAssessmentSessionRepository } from "@/lib/repositories";
import {
  labelAgeGroup,
  labelDesiredStartTiming,
  labelEmploymentStatus,
  labelRegion,
} from "@/lib/labels";
import type { AgeGroup, DesiredStartTiming, EmploymentStatus, Region, SupportAssessmentAnswers } from "@/types";

export interface SupportAnswerRow {
  label: string;
  count: number;
}

export interface SupportQuestionDistribution {
  /** 화면에 그대로 쓰는 질문 문구 */
  question: string;
  /** 이 문항에 답한 세션 수 (복수 선택은 선택 횟수 합계가 더 클 수 있다) */
  answeredCount: number;
  rows: SupportAnswerRow[];
}

export interface SupportResponseAnalytics {
  totalSessions: number;
  completedSessions: number;
  questions: SupportQuestionDistribution[];
}

const INCOME_LABELS: Record<string, string> = {
  low: "낮음",
  middle: "중간",
  high: "높음",
  unknown: "모름",
};

const INSURANCE_LABELS: Record<string, string> = {
  yes: "있음",
  no: "없음",
  unknown: "모름",
};

const HOUSEHOLD_LABELS: Record<string, string> = {
  single_parent: "한부모 가정",
  disability: "장애(본인·가족)",
  basic_livelihood: "기초생활수급·차상위",
  veteran: "국가유공자·보훈",
  none: "해당 없음",
};

/** 경력단절 개월 수는 값이 제각각이라 구간으로 묶어야 읽을 수 있다. */
function careerBreakBucket(months: number): string {
  if (months <= 6) return "6개월 이하";
  if (months <= 12) return "7~12개월";
  if (months <= 24) return "1~2년";
  if (months <= 60) return "2~5년";
  return "5년 초과";
}

/**
 * "지원금 찾기" 진단에서 사람들이 무엇을 골랐는지 문항별로 집계한다.
 *
 * 답변은 support_assessment_sessions.answers 에 한 세션당 객체 하나로 저장돼 있어,
 * 그대로 두면 관리자가 볼 수 있는 형태가 아니다. 문항별 선택 분포로 펼쳐서 돌려준다.
 */
export async function getSupportResponseAnalytics(): Promise<SupportResponseAnalytics> {
  const sessions = await getSupportAssessmentSessionRepository().findAll({});
  const completed = sessions.filter((s) => s.status === "completed");

  /** 세션 목록에서 문항 하나를 뽑아 라벨 목록으로 바꾼 뒤 집계한다. */
  function distribution(
    question: string,
    pick: (answers: SupportAssessmentAnswers) => string | string[] | undefined,
  ): SupportQuestionDistribution {
    const counts = new Map<string, number>();
    let answeredCount = 0;

    for (const session of sessions) {
      const picked = pick(session.answers ?? {});
      const labels = picked === undefined ? [] : Array.isArray(picked) ? picked : [picked];
      if (labels.length === 0) continue;
      answeredCount += 1;
      for (const label of labels) {
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    }

    return {
      question,
      answeredCount,
      rows: [...counts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  const questions: SupportQuestionDistribution[] = [
    distribution("거주 지역", (a) => (a.region ? labelRegion(a.region as Region) : undefined)),
    distribution("연령대", (a) => (a.ageGroup ? labelAgeGroup(a.ageGroup as AgeGroup) : undefined)),
    distribution("현재 취업 상태", (a) =>
      a.employmentStatus ? labelEmploymentStatus(a.employmentStatus as EmploymentStatus) : undefined,
    ),
    distribution("취업 희망 시기", (a) =>
      a.desiredStartTiming ? labelDesiredStartTiming(a.desiredStartTiming as DesiredStartTiming) : undefined,
    ),
    distribution("최근 3년 내 고용보험 가입", (a) =>
      a.employmentInsuranceHistory ? (INSURANCE_LABELS[a.employmentInsuranceHistory] ?? a.employmentInsuranceHistory) : undefined,
    ),
    distribution("가구 소득 수준", (a) => (a.incomeBand ? (INCOME_LABELS[a.incomeBand] ?? a.incomeBand) : undefined)),
    distribution("가구 특성 (복수 선택)", (a) =>
      a.householdTraits?.length ? a.householdTraits.map((t) => HOUSEHOLD_LABELS[t] ?? t) : undefined,
    ),
    distribution("경력단절 여부", (a) =>
      a.careerBreak === undefined ? undefined : a.careerBreak ? "있음" : "없음",
    ),
    distribution("경력단절 기간", (a) =>
      typeof a.careerBreakMonths === "number" ? careerBreakBucket(a.careerBreakMonths) : undefined,
    ),
    distribution("직업훈련 참여 의향", (a) =>
      typeof a.trainingWillingness === "number" ? `${a.trainingWillingness}점` : undefined,
    ),
    distribution("정부지원 활용 의향", (a) =>
      a.openToGovSupport === undefined ? undefined : a.openToGovSupport ? "있음" : "없음",
    ),
  ].filter((q) => q.answeredCount > 0);

  return {
    totalSessions: sessions.length,
    completedSessions: completed.length,
    questions,
  };
}
