import "server-only";
import {
  getAssessmentSessionRepository,
  getConsultationRepository,
  getResumeRepository,
  getSupportAssessmentSessionRepository,
} from "@/lib/repositories";
import { activityEventLogger } from "@/lib/activity/event-logger";
import { progressSteps } from "./progress-steps.data";

/** 단계 id -> 완료 여부. progress-steps.data 의 id 와 1:1 대응한다. */
export type ProgressStatus = Record<string, boolean>;

export interface ProgressSummary {
  status: ProgressStatus;
  /** 완료한 단계 수 */
  doneCount: number;
  /** 아직 끝내지 않은 첫 단계. 전부 완료했다면 null */
  nextStepId: string | null;
}

/**
 * 각 단계의 완료 판정에 쓰는 신호.
 * 별도 진행률 테이블을 두지 않고 이미 쌓이는 데이터로 역산한다.
 */
async function loadStatus(userId: string): Promise<ProgressStatus> {
  const [assessments, supportSessions, resumes, consultations, events] = await Promise.all([
    getAssessmentSessionRepository().findAll({ userId, status: "completed" }),
    getSupportAssessmentSessionRepository().findAll({ userId, status: "completed" }),
    getResumeRepository().findAll({ userId }),
    getConsultationRepository().findAll({ userId }),
    activityEventLogger.getEventsByUser(userId),
  ]);

  return {
    diagnosis: assessments.length > 0,
    training: supportSessions.length > 0,
    apply: resumes.length > 0,
    interview: consultations.length > 0,
    employment: events.some((e) => e.eventType === "job_apply_clicked"),
  };
}

export async function getProgressSummary(userId: string | null): Promise<ProgressSummary> {
  if (!userId) {
    return {
      status: Object.fromEntries(progressSteps.map((s) => [s.id, false])),
      doneCount: 0,
      nextStepId: progressSteps[0]?.id ?? null,
    };
  }

  let status: ProgressStatus;
  try {
    status = await loadStatus(userId);
  } catch {
    // 진행 현황은 부가 정보다. 조회 실패가 홈 렌더링을 막지 않도록 빈 상태로 떨어뜨린다.
    status = Object.fromEntries(progressSteps.map((s) => [s.id, false]));
  }

  const doneCount = progressSteps.filter((s) => status[s.id]).length;
  const nextStepId = progressSteps.find((s) => !status[s.id])?.id ?? null;
  return { status, doneCount, nextStepId };
}
