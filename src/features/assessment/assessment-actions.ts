"use server";

import {
  completeAssessmentSession,
  logContentRecommendationClicked,
  logOccupationResultClicked,
  startAssessmentSession,
  submitAssessmentAnswer,
} from "@/features/assessment-engine/assessment-service";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * userId는 클라이언트 입력을 신뢰하지 않고 항상 서버 세션(getCurrentUser)에서 도출한다.
 * /assessment는 Member-first 보호 Route이므로 정상 Flow에서는 항상 로그인 사용자여야 하지만,
 * 방어적으로 세션이 없는 경우 anonymousId만으로도 동작하게 유지한다 (기존 anonymous 호환).
 */
export async function startAssessmentSessionAction(params: { anonymousId?: string }) {
  const user = await getCurrentUser();
  const { session, assessment } = await startAssessmentSession({
    userId: user?.id,
    anonymousId: params.anonymousId,
  });
  return { sessionId: session.id, assessmentId: assessment.id };
}

export async function submitAssessmentAnswerAction(params: {
  sessionId: string;
  questionId: string;
  optionId?: string;
  optionIds?: string[];
  rawValue?: unknown;
}) {
  const session = await submitAssessmentAnswer(params);
  return { currentStep: session.currentStep, currentSection: session.currentSection, status: session.status };
}

export async function completeAssessmentSessionAction(sessionId: string) {
  const result = await completeAssessmentSession(sessionId);
  return { resultId: result.id, sessionId: result.sessionId };
}

/**
 * userId 파라미터는 하위호환을 위해 시그니처만 유지하고 실제로는 사용하지 않는다 (클라이언트가
 * 임의의 userId로 활동 로그를 남기는 것을 방지). 항상 서버 세션에서 다시 조회한다.
 */
export async function trackOccupationResultClickAction(
  sessionId: string,
  occupationId: string,
  _userId?: string,
  anonymousId?: string,
) {
  const user = await getCurrentUser();
  await logOccupationResultClicked(sessionId, occupationId, user?.id, user ? undefined : anonymousId);
}

export async function trackContentRecommendationClickAction(
  sessionId: string,
  contentId: string,
  _userId?: string,
  anonymousId?: string,
) {
  const user = await getCurrentUser();
  await logContentRecommendationClicked(sessionId, contentId, user?.id, user ? undefined : anonymousId);
}
