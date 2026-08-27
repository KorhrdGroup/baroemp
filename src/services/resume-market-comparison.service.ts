import { resolveOccupationForJobCategory } from "@/lib/jobs/job-occupation-resolver";
import {
  getCoverLetterRepository,
  getJobRepository,
  getOccupationRepository,
  getResumeRepository,
} from "@/lib/repositories";
import type { CareerGapResultView, ResumeMarketComparisonView } from "@/types";
import { runCareerGapAnalysis } from "./career-gap-engine.service";
import { mergeResumeToCareerProfile } from "./resume-career-merge.service";

const MAX_CARD_ITEMS = 3;

/**
 * 첨삭 결과 화면 "시장 비교 카드" 서비스 (설계: docs/superpowers/specs/2026-08-26-resume-market-comparison-design.md).
 *
 * AI 첨삭과 완전히 독립적으로 동작한다 - 카드의 모든 수치는 기존 Career Gap Engine의
 * 결정론적 산출값(시장 통계 + Counterfactual Simulation)만 사용하고 AI는 개입하지 않는다 (스펙 49/50번).
 * 엔진 실패 시 UNAVAILABLE을 반환해 카드만 숨기고 첨삭 흐름에는 영향을 주지 않는다.
 */
export async function getMarketComparisonForTarget(params: {
  userId: string;
  targetOccupationId?: string;
  targetJobId?: string;
  desiredJobTitle?: string;
}): Promise<ResumeMarketComparisonView> {
  const occupationId = await resolveTargetOccupationId(params);
  if (!occupationId) return { state: "NEEDS_TARGET", items: [] };

  try {
    const result = await runCareerGapAnalysis({
      userId: params.userId,
      occupationId,
      targetJobId: params.targetJobId,
    });
    return toComparisonView(result);
  } catch (error) {
    console.error("[resume-market-comparison] 커리어갭 분석 실패", error);
    return { state: "UNAVAILABLE", items: [] };
  }
}

/** 이력서 첨삭용: merge(best-effort) 후 이력서의 타겟 정보로 카드 산출. */
export async function getResumeMarketComparison(resumeId: string): Promise<ResumeMarketComparisonView> {
  const resume = await getResumeRepository().findById(resumeId);
  if (!resume) return { state: "UNAVAILABLE", items: [] };

  try {
    await mergeResumeToCareerProfile(resumeId);
  } catch (error) {
    // merge는 best-effort - 실패해도 기존 프로필 기준으로 카드는 계속 산출한다 (설계 8절)
    console.error("[resume-market-comparison] 프로필 병합 실패", error);
  }

  return getMarketComparisonForTarget({
    userId: resume.userId,
    targetOccupationId: resume.targetOccupationId,
    targetJobId: resume.targetJobId,
    desiredJobTitle: resume.desiredJobTitle,
  });
}

/** 자소서 첨삭용: 자소서에 연결된 공고 기준. */
export async function getCoverLetterMarketComparison(coverLetterId: string): Promise<ResumeMarketComparisonView> {
  const coverLetter = await getCoverLetterRepository().findById(coverLetterId);
  if (!coverLetter) return { state: "UNAVAILABLE", items: [] };

  return getMarketComparisonForTarget({
    userId: coverLetter.userId,
    targetOccupationId: coverLetter.targetOccupationId,
    targetJobId: coverLetter.targetJobId,
  });
}

/**
 * 타겟 occupation 3단계 fallback (설계 4절):
 * ① targetOccupationId 직접 → ② targetJobId 공고의 jobCategory → ③ desiredJobTitle 이름 매칭.
 */
async function resolveTargetOccupationId(params: {
  targetOccupationId?: string;
  targetJobId?: string;
  desiredJobTitle?: string;
}): Promise<string | undefined> {
  if (params.targetOccupationId) return params.targetOccupationId;

  if (params.targetJobId) {
    const job = await getJobRepository().findById(params.targetJobId);
    const occupation = await resolveOccupationForJobCategory(job?.jobCategory);
    if (occupation) return occupation.id;
  }

  const title = params.desiredJobTitle?.trim();
  if (title) {
    const occupations = await getOccupationRepository().findAll();
    const matched = occupations.find((o) => o.name.includes(title) || title.includes(o.name));
    if (matched) return matched.id;
  }

  return undefined;
}

function toComparisonView(result: CareerGapResultView): ResumeMarketComparisonView {
  const showRate = result.isDataSufficient && result.confidence !== "LOW";

  const items = result.improvementItems
    .filter((item) => item.userStatus === "NOT_SATISFIED")
    .slice(0, MAX_CARD_ITEMS)
    .map((item) => {
      const recommendation = result.recommendations.find(
        (r) => r.requirementId === item.requirementId && r.contentId,
      );
      return {
        requirementId: item.requirementId,
        requirementName: item.requirementName,
        marketRate: Math.min(100, Math.round(item.marketRequiredRate + item.marketPreferredRate)),
        showRate,
        currentEligibleJobCount: result.currentEligibleJobCount,
        projectedEligibleJobCount: item.projectedEligibleJobCount,
        recommendedContent: recommendation?.contentId
          ? { contentId: recommendation.contentId, title: recommendation.title }
          : undefined,
      };
    });

  return {
    state: "READY",
    analysisId: result.analysisId,
    occupationName: result.occupationName,
    marketSampleSize: result.marketSampleSize,
    items,
  };
}
