"use server";

import { logActivityEvent } from "@/lib/activity/event-logger";
import { extractSupportInterestTags } from "@/lib/support/support-tag-rules";
import { getCurrentUser, requireSessionUser } from "@/lib/auth/session";
import { findCareerProfileByUserId, getSupportBookmarkRepository, getSupportProgramRepository } from "@/lib/repositories";
import { recalculateLeadScore } from "@/services/lead-score.service";

/** 활동 로그용 userId/anonymousId를 결정한다. 클라이언트가 넘긴 userId는 신뢰하지 않고 항상 세션을 우선한다. */
async function resolveActorIds(anonymousId?: string): Promise<{ userId?: string; anonymousId?: string }> {
  const user = await getCurrentUser();
  return user ? { userId: user.id, anonymousId: undefined } : { userId: undefined, anonymousId };
}
import {
  completeSupportAssessment,
  getSupportAssessmentPrefill,
  saveSupportAssessmentAnswers,
  startSupportAssessment,
} from "@/services/support-assessment.service";
import { getRelatedContentForSupportProgram, promoteSupportInterestTags } from "@/services/support-interest.service";
import type { CareerContent, SupportAssessmentAnswers, SupportProgram } from "@/types";

function buildSupportMetadata(program: SupportProgram, extra?: Record<string, unknown>): Record<string, unknown> {
  return {
    supportProgramId: program.id,
    title: program.title,
    provider: program.externalSource,
    category: program.category,
    region: program.regionScope,
    tags: extractSupportInterestTags(program),
    ...extra,
  };
}

export interface GetSupportAssessmentPrefillInput {
  userId?: string;
  anonymousId?: string;
}

/** Career Profile 재사용(스펙 8번): 진단 시작 전 기존 값으로 답변을 미리 채운다. */
export async function getSupportAssessmentPrefillAction(
  input: GetSupportAssessmentPrefillInput,
): Promise<Partial<SupportAssessmentAnswers>> {
  const actor = await resolveActorIds(input.anonymousId);
  return getSupportAssessmentPrefill(actor);
}

export interface SubmitSupportAssessmentInput {
  userId?: string;
  anonymousId?: string;
  answers: SupportAssessmentAnswers;
}

export interface SubmitSupportAssessmentResult {
  sessionId: string;
  highCount: number;
  checkRequiredCount: number;
  totalCount: number;
}

/**
 * 지원금 진단 제출 (시작 -> 답변 저장 -> 완료 처리를 한 번에 수행).
 * 질문 수가 적은 고정 플로우라 Career Assessment처럼 문항별 서버 왕복을 하지 않고,
 * 마지막 제출 시점에 한 번에 세션을 완결한다 (내부적으로는 여전히 세션/매칭/Career Profile 반영을 모두 거친다).
 */
export async function submitSupportAssessmentAction(
  input: SubmitSupportAssessmentInput,
): Promise<SubmitSupportAssessmentResult> {
  const actor = await resolveActorIds(input.anonymousId);
  const session = await startSupportAssessment({ userId: actor.userId, anonymousId: actor.anonymousId });
  await saveSupportAssessmentAnswers(session.id, input.answers);
  const result = await completeSupportAssessment(session.id);

  if (actor.userId) await recalculateLeadScore(actor.userId);

  return {
    sessionId: session.id,
    highCount: result?.highCount ?? 0,
    checkRequiredCount: result?.checkRequiredCount ?? 0,
    totalCount: result?.matches.length ?? 0,
  };
}

export interface TrackSupportViewedInput {
  supportProgramId: string;
  userId?: string;
  anonymousId?: string;
  matchScore?: number;
  eligibilityGrade?: string;
}

/** 지원제도 상세 조회 (SUPPORT_VIEWED). Support Interest 태그 승격 + Lead 재계산까지 처리한다. */
export async function trackSupportViewedAction(input: TrackSupportViewedInput): Promise<void> {
  const program = await getSupportProgramRepository().findById(input.supportProgramId);
  if (!program) return;
  const actor = await resolveActorIds(input.anonymousId);

  await logActivityEvent({
    userId: actor.userId,
    anonymousId: actor.anonymousId,
    eventType: "support_viewed",
    entityType: "support_program",
    entityId: program.id,
    metadata: buildSupportMetadata(program, { matchScore: input.matchScore, eligibilityGrade: input.eligibilityGrade }),
  });

  if (actor.userId) {
    await promoteSupportInterestTags(actor.userId, program);
    await recalculateLeadScore(actor.userId);
  }
}

export interface TrackSupportMatchViewedInput {
  supportProgramId: string;
  userId?: string;
  anonymousId?: string;
  matchScore: number;
  eligibilityGrade: string;
  context?: string;
}

/** 결과 페이지 카드 노출 시 (SUPPORT_MATCH_VIEWED). 관리자 CRM "높은 가능성 제도" 집계에 사용된다. */
export async function trackSupportMatchViewedAction(input: TrackSupportMatchViewedInput): Promise<void> {
  const program = await getSupportProgramRepository().findById(input.supportProgramId);
  if (!program) return;
  const actor = await resolveActorIds(input.anonymousId);

  await logActivityEvent({
    userId: actor.userId,
    anonymousId: actor.anonymousId,
    eventType: "support_match_viewed",
    entityType: "support_program",
    entityId: program.id,
    metadata: buildSupportMetadata(program, {
      matchScore: input.matchScore,
      eligibilityGrade: input.eligibilityGrade,
      context: input.context,
    }),
  });
}

export interface TrackSupportFilterChangedInput {
  userId?: string;
  anonymousId?: string;
  filter: Record<string, unknown>;
}

export async function trackSupportFilterChangedAction(input: TrackSupportFilterChangedInput): Promise<void> {
  const actor = await resolveActorIds(input.anonymousId);
  await logActivityEvent({
    userId: actor.userId,
    anonymousId: actor.anonymousId,
    eventType: "support_filter_changed",
    entityType: "support_program",
    metadata: { filter: input.filter },
  });
}

export interface TrackSupportApplyClickInput {
  supportProgramId: string;
  userId?: string;
  anonymousId?: string;
}

/** [공식 신청페이지 보기] 클릭 (SUPPORT_APPLY_CLICKED). 외부 이동 전에 호출한다. */
export async function trackSupportApplyClickAction(input: TrackSupportApplyClickInput): Promise<void> {
  const program = await getSupportProgramRepository().findById(input.supportProgramId);
  if (!program) return;
  const actor = await resolveActorIds(input.anonymousId);

  await logActivityEvent({
    userId: actor.userId,
    anonymousId: actor.anonymousId,
    eventType: "support_apply_clicked",
    entityType: "support_program",
    entityId: program.id,
    metadata: buildSupportMetadata(program),
  });

  if (actor.userId) await recalculateLeadScore(actor.userId);
}

export interface ToggleSupportBookmarkInput {
  supportProgramId: string;
  action: "add" | "remove";
}

/**
 * 회원 전용 찜 토글. userId는 파라미터로 받지 않고 항상 서버 세션에서 도출한다
 * (클라이언트가 임의의 userId를 넘겨 타인의 찜 목록을 조작하는 것을 방지).
 * 비회원은 localStorage(support-bookmark-local.ts)를 사용한다.
 */
export async function toggleSupportBookmarkAction(input: ToggleSupportBookmarkInput): Promise<{ bookmarked: boolean }> {
  const user = await requireSessionUser();
  const program = await getSupportProgramRepository().findById(input.supportProgramId);
  if (!program) throw new Error("존재하지 않는 지원제도입니다.");

  const repo = getSupportBookmarkRepository();
  if (input.action === "add") {
    await repo.add(user.id, input.supportProgramId);
    await logActivityEvent({
      userId: user.id,
      eventType: "support_bookmarked",
      entityType: "support_program",
      entityId: program.id,
      metadata: buildSupportMetadata(program),
    });
  } else {
    await repo.remove(user.id, input.supportProgramId);
    await logActivityEvent({
      userId: user.id,
      eventType: "support_unbookmarked",
      entityType: "support_program",
      entityId: program.id,
      metadata: buildSupportMetadata(program),
    });
  }

  await recalculateLeadScore(user.id);
  return { bookmarked: input.action === "add" };
}

export interface TrackAnonymousSupportBookmarkInput {
  anonymousId: string;
  supportProgramId: string;
  action: "add" | "remove";
}

/** 비회원 찜 토글 시 호출 (실제 저장은 클라이언트 localStorage). Activity Event 기록만 담당한다. */
export async function trackAnonymousSupportBookmarkAction(input: TrackAnonymousSupportBookmarkInput): Promise<void> {
  const program = await getSupportProgramRepository().findById(input.supportProgramId);
  if (!program) return;

  await logActivityEvent({
    anonymousId: input.anonymousId,
    eventType: input.action === "add" ? "support_bookmarked" : "support_unbookmarked",
    entityType: "support_program",
    entityId: program.id,
    metadata: buildSupportMetadata(program),
  });
}

/** 로그인 직후 localStorage에 쌓여있던 비회원 찜 supportProgramId들을 현재 로그인 사용자에게 병합한다. */
export async function mergeLocalSupportBookmarksAction(supportProgramIds: string[]): Promise<number> {
  if (supportProgramIds.length === 0) return 0;
  const user = await requireSessionUser();
  return getSupportBookmarkRepository().mergeSupportIds(user.id, supportProgramIds);
}

/** 현재 로그인 사용자 기준으로만 조회한다 (타인의 찜 여부 조회 차단). */
export async function isSupportBookmarkedAction(supportProgramId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return getSupportBookmarkRepository().isBookmarked(user.id, supportProgramId);
}

/** 현재 로그인 사용자 기준으로만 조회한다 (타인의 찜 목록 조회 차단). */
export async function getUserSupportBookmarkIdsAction(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const bookmarks = await getSupportBookmarkRepository().findAllByUser(user.id);
  return bookmarks.map((b) => b.supportProgramId);
}

/** 지원제도 상세페이지 "함께 준비할 수 있는 과정" 추천 (스펙 18번). */
export async function getRelatedContentForSupportProgramAction(
  supportProgramId: string,
): Promise<CareerContent[]> {
  const program = await getSupportProgramRepository().findById(supportProgramId);
  if (!program) return [];
  const user = await getCurrentUser();
  const profile = user ? ((await findCareerProfileByUserId(user.id)) ?? undefined) : undefined;
  return getRelatedContentForSupportProgram(program, profile);
}
