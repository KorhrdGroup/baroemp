"use server";

import { requireAdmin, requireSessionUser } from "@/lib/auth/session";
import { getCareerGapRepository, getUserDestinationInterestRepository } from "@/lib/repositories";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { getCareerGapResult, runCareerGapAnalysis } from "@/services/career-gap-engine.service";
import { recalculateMarketSnapshot } from "@/services/market-requirement.service";
import type { CareerGapResultView, MarketRequirementSnapshot } from "@/types";

export interface RunCareerGapAnalysisActionInput {
  occupationId: string;
  employmentDestinationId?: string;
  targetJobId?: string;
}

/**
 * /career-gap 분석 실행 (스펙 27번 Flow의 "분석" 단계).
 * userId는 항상 세션에서 도출하며, 사용자가 고른 직업/취업처는 Career DB에도 함께 기록한다 (스펙 44번).
 */
export async function runCareerGapAnalysisAction(
  input: RunCareerGapAnalysisActionInput,
): Promise<{ analysisId: string }> {
  const user = await requireSessionUser();

  await getUserDestinationInterestRepository().upsert({
    userId: user.id,
    occupationId: input.occupationId,
    employmentDestinationId: input.employmentDestinationId,
  });

  const result = await runCareerGapAnalysis({
    userId: user.id,
    occupationId: input.occupationId,
    employmentDestinationId: input.employmentDestinationId,
    targetJobId: input.targetJobId,
  });
  return { analysisId: result.analysisId };
}

/** 결과 재조회. 본인 소유 분석만 조회 가능하다 (RLS와 별개로 Server Action 계층에서도 강제). */
export async function getMyCareerGapResultAction(analysisId: string): Promise<CareerGapResultView | null> {
  const user = await requireSessionUser();
  const analysis = await getCareerGapRepository().findAnalysisById(analysisId);
  if (!analysis || analysis.userId !== user.id) return null;
  return getCareerGapResult(analysisId);
}

/** 결과 화면에서 개별 Gap 항목을 펼쳐볼 때 (CAREER_GAP_ITEM_VIEWED, 스펙 42번). 원문 전체는 기록하지 않는다. */
export async function trackCareerGapItemViewedAction(input: {
  analysisId: string;
  requirementId: string;
  marketRate: number;
  source?: "resume_review" | "cover_letter_review";
}): Promise<void> {
  const user = await requireSessionUser();
  await logActivityEvent({
    userId: user.id,
    eventType: "career_gap_item_viewed",
    entityType: "career_gap_analysis",
    entityId: input.analysisId,
    metadata: { requirementId: input.requirementId, marketRate: input.marketRate, source: input.source },
  });
}

export async function trackCareerGapSimulationViewedAction(input: {
  analysisId: string;
  requirementIds: string[];
  projectedJobCount: number;
}): Promise<void> {
  const user = await requireSessionUser();
  await logActivityEvent({
    userId: user.id,
    eventType: "career_gap_simulation_viewed",
    entityType: "career_gap_analysis",
    entityId: input.analysisId,
    metadata: { requirementIds: input.requirementIds, projectedJobCount: input.projectedJobCount },
  });
}

export async function trackCareerGapRecommendationClickedAction(input: {
  analysisId: string;
  requirementId: string;
  contentId?: string;
  source?: "resume_review" | "cover_letter_review";
}): Promise<void> {
  const user = await requireSessionUser();
  await logActivityEvent({
    userId: user.id,
    eventType: input.contentId ? "career_gap_content_clicked" : "career_gap_recommendation_clicked",
    entityType: "career_gap_analysis",
    entityId: input.analysisId,
    metadata: { requirementId: input.requirementId, contentId: input.contentId, source: input.source },
  });
}

export async function trackCareerGapJobClickedAction(input: { analysisId: string; jobId: string }): Promise<void> {
  const user = await requireSessionUser();
  await logActivityEvent({
    userId: user.id,
    eventType: "career_gap_job_clicked",
    entityType: "career_gap_analysis",
    entityId: input.analysisId,
    metadata: { jobId: input.jobId },
  });
}

/** 관리자 "[시장 요구조건 다시 분석]" 액션 (스펙 47번). */
export async function recalculateMarketSnapshotAction(input: {
  occupationId?: string;
  employmentDestinationId?: string;
}): Promise<MarketRequirementSnapshot> {
  const admin = await requireAdmin();
  if (!admin) throw new Error("관리자 권한이 필요합니다.");
  return recalculateMarketSnapshot({ occupationId: input.occupationId, destinationId: input.employmentDestinationId });
}
