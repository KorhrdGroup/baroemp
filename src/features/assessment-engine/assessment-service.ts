import { activityEventLogger } from "@/lib/activity/event-logger";
import { matchingEngine } from "@/lib/matching/engine";
import {
  findCareerProfileByUserId,
  getAssessmentAnswerRepository,
  getAssessmentResultRepository,
  getAssessmentSessionRepository,
  getJobInterestRepository,
  getMatchResultRepository,
  getOccupationMatchingRules,
  listActiveOccupations,
} from "@/lib/repositories";
import { listContents } from "@/services/content.service";
import { mergeCareerProfileFromAssessment } from "@/services/career-profile-merge.service";
import { recalculateLeadScore } from "@/services/lead-score.service";
import type {
  Assessment,
  AssessmentResult,
  AssessmentSession,
  CareerContent,
  CareerProfile,
  OccupationMatchingRule,
} from "@/types";
import { getActiveDefaultAssessment, loadAssessment, type LoadedAssessment } from "./question-loader";
import { normalizeAnswer, type RawAnswerInput } from "./answer-normalizer";
import { buildAssessmentResult, ENGINE_VERSION } from "./result-builder";

function toGrade(score: number): "A" | "B" | "C" | "D" {
  if (score >= 60) return "A";
  if (score >= 40) return "B";
  if (score >= 20) return "C";
  return "D";
}

export interface StartSessionParams {
  userId?: string;
  anonymousId?: string;
  assessmentId?: string;
}

/**
 * 하다 만 검사 세션 중 이어서 진행할 수 있는 가장 최근 1건.
 *
 * 시작 버튼은 항상 새 세션을 만들기 때문에, 이 함수가 없으면 중간에 나간 사람은
 * 매번 1번 문항부터 다시 시작하고 이전 답변은 그대로 버려진다.
 */
export async function findResumableSession(params: {
  userId?: string;
  anonymousId?: string;
}): Promise<AssessmentSession | null> {
  if (!params.userId && !params.anonymousId) return null;

  const repo = getAssessmentSessionRepository();
  const sessions = await repo.findAll(
    params.userId ? { userId: params.userId } : { anonymousId: params.anonymousId },
  );

  // 답을 하나도 안 한 'started'까지 이어하기로 안내하면 "이어서 하기"가 무의미하므로
  // 실제로 진행한(in_progress) 세션만 대상으로 한다.
  return (
    sessions
      .filter((s) => s.status === "in_progress")
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0] ?? null
  );
}

export async function startAssessmentSession(
  params: StartSessionParams,
): Promise<{ session: AssessmentSession; assessment: Assessment }> {
  const assessment = params.assessmentId
    ? (await loadAssessment(params.assessmentId))?.assessment
    : await getActiveDefaultAssessment();
  if (!assessment) throw new Error("활성화된 검사를 찾을 수 없습니다.");

  const sections = [...assessment.sections].sort((a, b) => a.order - b.order);
  const session = await getAssessmentSessionRepository().create({
    assessmentId: assessment.id,
    userId: params.userId,
    anonymousId: params.anonymousId,
    totalSteps: assessment.questions.length,
    currentSection: sections[0]?.key ?? "basic",
  });

  await activityEventLogger.log({
    userId: params.userId,
    anonymousId: params.anonymousId,
    sessionId: session.id,
    eventType: "assessment_started",
    entityType: "assessment",
    entityId: assessment.id,
    metadata: { sessionId: session.id },
  });

  return { session, assessment };
}

export interface SubmitAnswerParams extends RawAnswerInput {
  sessionId: string;
}

export async function submitAssessmentAnswer(params: SubmitAnswerParams): Promise<AssessmentSession> {
  const sessionRepo = getAssessmentSessionRepository();
  const session = await sessionRepo.findById(params.sessionId);
  if (!session) throw new Error("검사 세션을 찾을 수 없습니다.");

  const loaded = await loadAssessment(session.assessmentId);
  if (!loaded) throw new Error("검사 정보를 불러올 수 없습니다.");
  const question = loaded.questionsById.get(params.questionId);
  if (!question) throw new Error("질문을 찾을 수 없습니다.");

  const normalized = normalizeAnswer(question, params, session.id);
  await getAssessmentAnswerRepository().upsert(normalized);

  const answeredCount = (await getAssessmentAnswerRepository().findBySession(session.id)).length;
  const questionIndex = loaded.orderedQuestions.findIndex((q) => q.id === question.id);
  const nextQuestion = loaded.orderedQuestions[questionIndex + 1];
  const sectionChanged = nextQuestion && nextQuestion.section !== question.section;

  if (sectionChanged || !nextQuestion) {
    await activityEventLogger.log({
      userId: session.userId,
      anonymousId: session.anonymousId,
      sessionId: session.id,
      eventType: "assessment_section_completed",
      entityType: "assessment",
      entityId: session.assessmentId,
      metadata: { sessionId: session.id, section: question.section },
    });
  }

  await activityEventLogger.log({
    userId: session.userId,
    anonymousId: session.anonymousId,
    sessionId: session.id,
    eventType: "assessment_answered",
    entityType: "assessment",
    entityId: session.assessmentId,
    metadata: { sessionId: session.id, questionId: question.id },
  });

  const updated = await sessionRepo.update(session.id, {
    status: "in_progress",
    currentStep: answeredCount,
    currentSection: nextQuestion?.section ?? question.section,
  });
  return updated ?? session;
}

async function loadOccupationContext(): Promise<{
  occupations: Awaited<ReturnType<typeof listActiveOccupations>>;
  rulesByOccupation: Map<string, OccupationMatchingRule[]>;
  contents: CareerContent[];
}> {
  const occupations = await listActiveOccupations();
  const rules = await getOccupationMatchingRules();
  const rulesByOccupation = new Map<string, OccupationMatchingRule[]>();
  for (const rule of rules) {
    const list = rulesByOccupation.get(rule.occupationId) ?? [];
    list.push(rule);
    rulesByOccupation.set(rule.occupationId, list);
  }
  const contents = await listContents({ status: "published" });
  return { occupations, rulesByOccupation, contents };
}

export async function completeAssessmentSession(sessionId: string): Promise<AssessmentResult> {
  const sessionRepo = getAssessmentSessionRepository();
  const session = await sessionRepo.findById(sessionId);
  if (!session) throw new Error("검사 세션을 찾을 수 없습니다.");

  /*
   * 완료 요청이 두 번 들어와도 결과는 세션당 하나여야 한다.
   * 마지막 문항 제출이 중복 실행되면(더블클릭·재시도) 같은 세션에 결과가 두 건 쌓였고,
   * 결과 조회는 한 건을 전제하므로 그때부터 결과 화면이 통째로 열리지 않았다.
   */
  const existingResult = await getAssessmentResultRepository().findBySessionId(sessionId);
  if (existingResult) return existingResult;

  const loaded = await loadAssessment(session.assessmentId);
  if (!loaded) throw new Error("검사 정보를 불러올 수 없습니다.");

  const answers = await getAssessmentAnswerRepository().findBySession(sessionId);
  const { occupations, rulesByOccupation, contents } = await loadOccupationContext();
  const existingProfile = session.userId ? await findCareerProfileByUserId(session.userId) : undefined;

  const resultInput = buildAssessmentResult({
    sessionId,
    assessmentId: session.assessmentId,
    userId: session.userId,
    anonymousId: session.anonymousId,
    questions: loaded.orderedQuestions,
    answers,
    occupations,
    rulesByOccupation,
    contents,
    existingProfile: existingProfile ?? undefined,
  });

  const result = await getAssessmentResultRepository().create(resultInput);

  await sessionRepo.update(sessionId, { status: "completed", completedAt: result.completedAt });

  const ownerId = session.userId ?? session.anonymousId;
  const jobInterestRepo = getJobInterestRepository();
  const matchResultRepo = getMatchResultRepository();

  for (const rec of result.recommendations) {
    await jobInterestRepo.upsert({
      userId: session.userId,
      anonymousId: session.anonymousId,
      occupationId: rec.occupationId,
      occupationName: rec.occupationName,
      interestScore: rec.totalScore,
      source: "ASSESSMENT",
    });

    await matchResultRepo.create({
      sourceType: "user",
      sourceId: ownerId ?? "anonymous",
      userId: session.userId,
      anonymousId: session.anonymousId,
      targetType: "occupation",
      targetId: rec.occupationId,
      score: rec.totalScore,
      grade: toGrade(rec.totalScore),
      reasons: rec.reasons.map((label, i) => ({ ruleKey: `occupation_reason_${i}`, label, score: 0 })),
      engineVersion: ENGINE_VERSION,
    });
  }

  if (session.userId) {
    await mergeCareerProfileFromAssessment(session.userId, {
      ...result.extractedProfile,
      interestTags: result.generatedTags,
    });
  }

  await activityEventLogger.log({
    userId: session.userId,
    anonymousId: session.anonymousId,
    sessionId,
    eventType: "assessment_completed",
    entityType: "assessment",
    entityId: session.assessmentId,
    metadata: {
      sessionId,
      resultId: result.id,
      topOccupationId: result.recommendations[0]?.occupationId,
      topScore: result.recommendations[0]?.totalScore,
    },
  });

  if (session.userId) {
    await recalculateLeadScore(session.userId);
  }

  return result;
}

export async function getAssessmentResultBySession(
  sessionId: string,
): Promise<{ session: AssessmentSession; result: AssessmentResult } | null> {
  const session = await getAssessmentSessionRepository().findById(sessionId);
  if (!session) return null;
  const result = await getAssessmentResultRepository().findBySessionId(sessionId);
  if (!result) return null;
  return { session, result };
}

export async function loadAssessmentForSession(session: AssessmentSession): Promise<LoadedAssessment | null> {
  return loadAssessment(session.assessmentId);
}

/** 결과 화면에서 사용하는 일반 콘텐츠 추천 (특정 직업에 종속되지 않은 Top 콘텐츠). */
export async function getContentRecommendationsForResult(result: AssessmentResult, limit = 5): Promise<CareerContent[]> {
  const published = await listContents({ status: "published" });
  /*
   * 검사 결과 화면에서는 자격 취득 과정만 추천한다.
   *
   * 콘텐츠 상세 화면이 없어서 카드를 누르면 타입에 따라 /support, /consulting, /resume 중
   * 한 곳으로만 떨어진다. 검사·컨설팅·이력서 같은 항목은 결과 화면에 이미 제 자리의 버튼이
   * 있으므로 여기서 또 권할 이유가 없고, 강의·교육 과정은 갈 안내 화면이 없다.
   * 남는 건 "부족한 조건을 자격으로 메운다"는 이 화면의 흐름과 맞는 자격 과정뿐이다.
   */
  const CERTIFICATE_TYPES = new Set(["LICENSE", "PRIVATE_CERTIFICATE"]);
  const contents = published.filter((c) => CERTIFICATE_TYPES.has(c.type));
  const pseudoProfile: CareerProfile = {
    id: "assessment-result-temp",
    userId: result.userId ?? result.anonymousId ?? "anonymous",
    createdAt: result.completedAt,
    updatedAt: result.completedAt,
    ...result.extractedProfile,
    interestTags: result.generatedTags.map((t) => t.replace(/^#/, "")),
  };
  const matches = matchingEngine.matchContentsForProfile(pseudoProfile, contents, limit);
  const byId = new Map(contents.map((c) => [c.id, c]));
  return matches.map((m) => byId.get(m.targetId)).filter((c): c is CareerContent => Boolean(c));
}

export async function logAssessmentResultViewed(
  sessionId: string,
  userId?: string,
  anonymousId?: string,
): Promise<void> {
  await activityEventLogger.log({
    userId,
    anonymousId,
    sessionId,
    eventType: "assessment_result_viewed",
    entityType: "assessment",
    metadata: { sessionId },
  });
}

export async function logOccupationResultClicked(
  sessionId: string,
  occupationId: string,
  userId?: string,
  anonymousId?: string,
): Promise<void> {
  await activityEventLogger.log({
    userId,
    anonymousId,
    sessionId,
    eventType: "occupation_result_clicked",
    entityType: "assessment",
    entityId: occupationId,
    metadata: { sessionId, occupationId },
  });
}

export async function logContentRecommendationClicked(
  sessionId: string,
  contentId: string,
  userId?: string,
  anonymousId?: string,
): Promise<void> {
  await activityEventLogger.log({
    userId,
    anonymousId,
    sessionId,
    eventType: "content_recommendation_clicked",
    entityType: "content",
    entityId: contentId,
    metadata: { sessionId, contentId },
  });
}
