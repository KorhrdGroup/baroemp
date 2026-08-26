import { activityEventLogger } from "@/lib/activity/event-logger";
import {
  findCareerProfileByUserId,
  getMatchResultRepository,
  getSupportAssessmentSessionRepository,
  getSupportProgramRepository,
} from "@/lib/repositories";
import { mergeCareerProfileFromAssessment } from "./career-profile-merge.service";
import { getAnonymousCareerSignal } from "./job-search.service";
import { CAREER_RELEVANCE_THRESHOLD } from "@/lib/support/career-relevance";
import { evaluateSupportEligibilityBatch, type SupportMatchDetail, type SupportMatchProfile } from "./support-eligibility.service";
import type { CareerProfile, CareerProfileInput, SupportAssessmentAnswers, SupportAssessmentSession, SupportProgram } from "@/types";

export interface StartSupportAssessmentInput {
  userId?: string;
  anonymousId?: string;
}

/**
 * Career Profile 재사용 (스펙 8번): 이미 Career Profile / 직업검사 결과가 있는 사용자는
 * 같은 질문을 다시 묻지 않도록 기존 값을 지원금 진단 답변 모양으로 미리 채워준다.
 * 사용자가 화면에서 값을 바꿀 수 있으므로, 여기서는 "기본값"만 제공한다.
 */
export async function getSupportAssessmentPrefill(
  input: StartSupportAssessmentInput,
): Promise<Partial<SupportAssessmentAnswers>> {
  let profile: CareerProfile | undefined;
  if (input.userId) {
    profile = (await findCareerProfileByUserId(input.userId)) ?? undefined;
  } else if (input.anonymousId) {
    profile = await getAnonymousCareerSignal(input.anonymousId);
  }
  if (!profile) return {};

  return {
    ageGroup: profile.ageGroup,
    region: profile.region,
    employmentStatus: profile.employmentStatus,
    desiredStartTiming: profile.desiredStartTiming,
    trainingWillingness: profile.isOpenToTraining === undefined ? undefined : profile.isOpenToTraining ? 4 : 2,
    heldQualifications: profile.heldQualifications,
    desiredJobCategories: profile.desiredJobCategories,
    careerBreak: (profile.careerBreakMonths ?? 0) > 0,
    careerBreakMonths: profile.careerBreakMonths,
  };
}

export function toSupportMatchProfile(answers: SupportAssessmentAnswers): SupportMatchProfile {
  return {
    ageGroup: answers.ageGroup,
    birthYear: answers.birthYear,
    employmentInsuranceHistory: answers.employmentInsuranceHistory,
    incomeBand: answers.incomeBand,
    householdTraits: answers.householdTraits,
    region: answers.region,
    employmentStatus: answers.employmentStatus,
    desiredStartTiming: answers.desiredStartTiming,
    trainingWillingness: answers.trainingWillingness,
    heldQualifications: answers.heldQualifications,
    desiredJobCategories: answers.desiredJobCategories,
    careerBreak: answers.careerBreak,
    careerBreakMonths: answers.careerBreakMonths,
  };
}

export async function startSupportAssessment(input: StartSupportAssessmentInput): Promise<SupportAssessmentSession> {
  const prefill = await getSupportAssessmentPrefill(input);
  const session = await getSupportAssessmentSessionRepository().create({
    userId: input.userId,
    anonymousId: input.anonymousId,
    answers: prefill,
  });

  await activityEventLogger.log({
    userId: input.userId,
    anonymousId: input.anonymousId,
    eventType: "support_search_started",
    entityType: "assessment",
    entityId: session.id,
    metadata: { sessionId: session.id },
  });

  return session;
}

export async function saveSupportAssessmentAnswers(
  sessionId: string,
  answers: Partial<SupportAssessmentAnswers>,
): Promise<SupportAssessmentSession | null> {
  const repo = getSupportAssessmentSessionRepository();
  const existing = await repo.findById(sessionId);
  if (!existing) return null;
  return repo.update(sessionId, { answers: { ...existing.answers, ...answers } });
}

export interface SupportAssessmentCompletionResult {
  session: SupportAssessmentSession;
  matches: Array<{ program: SupportProgram; detail: SupportMatchDetail }>;
  highCount: number;
  checkRequiredCount: number;
}

function mapCareerProfileUpdateFromAnswers(answers: SupportAssessmentAnswers): CareerProfileInput {
  const update: CareerProfileInput = {};
  if (answers.employmentStatus) update.employmentStatus = answers.employmentStatus;
  if (answers.desiredStartTiming) update.desiredStartTiming = answers.desiredStartTiming;
  if (answers.trainingWillingness !== undefined) update.isOpenToTraining = answers.trainingWillingness >= 3;
  if (answers.region) update.region = answers.region;
  if (answers.ageGroup) update.ageGroup = answers.ageGroup;
  if (answers.careerBreakMonths !== undefined) update.careerBreakMonths = answers.careerBreakMonths;
  if (answers.heldQualifications?.length) update.heldQualifications = answers.heldQualifications;
  if (answers.desiredJobCategories?.length) update.desiredJobCategories = answers.desiredJobCategories;
  return update;
}

/**
 * 지원금 진단 완료 처리 (스펙 7~11, 16번).
 *
 * 1. 세션을 completed로 변경
 * 2. 활성 지원제도 전체를 대상으로 Eligibility Rule Engine을 돌려 매칭 등급/점수를 계산
 * 3. 점수가 있는(0점 초과) 매칭 결과를 match_results(target_type=support_program)에 저장
 * 4. 로그인 사용자는 답변을 Career Profile에 병합(STEP 3 merge 정책 재사용, 무조건 덮어쓰기 금지)
 * 5. SUPPORT_SEARCH_COMPLETED Activity 기록 (Lead Score 재계산은 호출부의 책임 - 회원가입 전환/서버 액션에서 트리거)
 */
export async function completeSupportAssessment(sessionId: string): Promise<SupportAssessmentCompletionResult | null> {
  const sessionRepo = getSupportAssessmentSessionRepository();
  const session = await sessionRepo.findById(sessionId);
  if (!session) return null;

  const answers = session.answers;
  const matchProfile = toSupportMatchProfile(answers);

  // search()는 pageSize를 100으로 clamp하므로 200을 넘겨도 매칭 대상이 조용히 잘린다.
  // 여기서는 페이지네이션이 필요 없는 전체 조회이므로 findAll을 쓴다(mock/supabase 모두 같은 필터를 적용).
  const allPrograms = await getSupportProgramRepository().findAll({
    activeOnly: true,
    minCareerRelevanceScore: CAREER_RELEVANCE_THRESHOLD,
  });
  // 개인 진단이므로 기업(고용주) 전용 제도는 제외한다. 기업 지원은 결과 화면의 별도 섹션에서 안내한다.
  const programs = allPrograms.filter((p) => (p.audience ?? "personal") !== "business");
  const detailByProgramId = await evaluateSupportEligibilityBatch(programs, matchProfile);

  const matches = programs
    .map((program) => ({ program, detail: detailByProgramId.get(program.id)! }))
    .filter((m) => m.detail.score > 0 || m.detail.grade !== "LOW")
    .sort((a, b) => b.detail.score - a.detail.score);

  const sourceId = session.userId ?? session.anonymousId ?? "";
  if (sourceId) {
    const matchResultRepo = getMatchResultRepository();
    for (const { program, detail } of matches.slice(0, 50)) {
      await matchResultRepo.create({
        sourceType: "user",
        sourceId,
        userId: session.userId,
        anonymousId: session.userId ? undefined : session.anonymousId,
        targetType: "support_program",
        targetId: program.id,
        score: detail.score,
        grade: detail.grade,
        reasons: detail.reasons,
        detail: {
          matchedConditions: detail.matchedConditions,
          missingConditions: detail.missingConditions,
          checkRequiredConditions: detail.checkRequiredConditions,
        },
        engineVersion: "SUPPORT_ELIGIBILITY_V1",
      });
    }
  }

  const updated = await sessionRepo.update(sessionId, {
    status: "completed",
    completedAt: new Date().toISOString(),
  });

  if (session.userId) {
    await mergeCareerProfileFromAssessment(session.userId, mapCareerProfileUpdateFromAnswers(answers));
  }

  const highCount = matches.filter((m) => m.detail.grade === "HIGH").length;
  const checkRequiredCount = matches.filter((m) => m.detail.grade === "CHECK_REQUIRED").length;

  await activityEventLogger.log({
    userId: session.userId,
    anonymousId: session.userId ? undefined : session.anonymousId,
    eventType: "support_search_completed",
    entityType: "assessment",
    entityId: sessionId,
    metadata: { sessionId, highCount, checkRequiredCount, totalMatched: matches.length },
  });

  return {
    session: updated ?? { ...session, status: "completed" },
    matches,
    highCount,
    checkRequiredCount,
  };
}

/** 비회원 상태로 진행한 지원금 진단 세션/매칭결과를 회원가입 시 회원 계정으로 병합한다. */
export async function linkAnonymousSupportAssessmentToUser(anonymousId: string, userId: string): Promise<void> {
  await getSupportAssessmentSessionRepository().linkAnonymousToUser(anonymousId, userId);
  await getMatchResultRepository().linkAnonymousToUser(anonymousId, userId);
}
