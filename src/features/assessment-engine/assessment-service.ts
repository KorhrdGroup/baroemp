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
  const contents = await listContents({ status: "published" });
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
