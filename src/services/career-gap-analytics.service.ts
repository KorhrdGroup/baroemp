import {
  getCareerGapRepository,
  getCareerRequirementRepository,
  getEmploymentDestinationRepository,
  getOccupationRepository,
} from "@/lib/repositories";
import { listResumesForUser } from "./resume.service";
import { findRecommendedContent } from "./career-gap-engine.service";
import type { MarketRequirementSnapshot } from "@/types";

export interface CareerGapOccupationStat {
  key: string;
  label: string;
  analysisCount: number;
  averageReadinessScore: number;
}

export interface CareerGapTopRequirementStat {
  requirementId: string;
  requirementName: string;
  gapCount: number;
}

/** /admin/analytics "Career Gap" 섹션 (스펙 39번). 회원 수가 많아지면 SQL 집계로 옮길 수 있게 반환 타입은 얇게 유지한다. */
export interface CareerGapAnalyticsSnapshot {
  totalAnalyses: number;
  uniqueUserCount: number;
  averageReadinessScore: number;
  byTarget: CareerGapOccupationStat[];
  topGapRequirements: CareerGapTopRequirementStat[];
  qualificationDeficiencyRatePercent: number;
  skillDeficiencyRatePercent: number;
  resumeDeficiencyRatePercent: number;
}

const EMPTY_SNAPSHOT: CareerGapAnalyticsSnapshot = {
  totalAnalyses: 0,
  uniqueUserCount: 0,
  averageReadinessScore: 0,
  byTarget: [],
  topGapRequirements: [],
  qualificationDeficiencyRatePercent: 0,
  skillDeficiencyRatePercent: 0,
  resumeDeficiencyRatePercent: 0,
};

export async function getCareerGapAnalyticsSnapshot(): Promise<CareerGapAnalyticsSnapshot> {
  const repo = getCareerGapRepository();
  const analyses = await repo.findAllAnalyses(1000);
  if (analyses.length === 0) return EMPTY_SNAPSHOT;

  const [occupations, destinations, requirements, items] = await Promise.all([
    getOccupationRepository().findAll(),
    getEmploymentDestinationRepository().findAll(),
    getCareerRequirementRepository().findAll(),
    repo.findItemsByAnalysisIds(analyses.map((a) => a.id)),
  ]);
  const occupationById = new Map(occupations.map((o) => [o.id, o]));
  const destinationById = new Map(destinations.map((d) => [d.id, d]));
  const requirementById = new Map(requirements.map((r) => [r.id, r]));

  const uniqueUserCount = new Set(analyses.map((a) => a.userId)).size;
  const averageReadinessScore = Math.round(analyses.reduce((sum, a) => sum + a.readinessScore, 0) / analyses.length);

  const byTargetMap = new Map<string, { label: string; count: number; scoreSum: number }>();
  for (const analysis of analyses) {
    const key = analysis.employmentDestinationId ?? analysis.occupationId ?? "unknown";
    const label = analysis.employmentDestinationId
      ? destinationById.get(analysis.employmentDestinationId)?.name ?? "취업처 미지정"
      : occupationById.get(analysis.occupationId ?? "")?.name ?? "직업 미지정";
    const entry = byTargetMap.get(key) ?? { label, count: 0, scoreSum: 0 };
    entry.count += 1;
    entry.scoreSum += analysis.readinessScore;
    byTargetMap.set(key, entry);
  }
  const byTarget = [...byTargetMap.entries()]
    .map(([key, v]) => ({ key, label: v.label, analysisCount: v.count, averageReadinessScore: Math.round(v.scoreSum / v.count) }))
    .sort((a, b) => b.analysisCount - a.analysisCount);

  const gapCountByRequirement = new Map<string, number>();
  let qualTotal = 0;
  let qualGap = 0;
  let skillTotal = 0;
  let skillGap = 0;
  for (const item of items) {
    const requirement = requirementById.get(item.requirementId);
    if (!requirement) continue;
    const isGap = item.userStatus === "NOT_SATISFIED" || item.userStatus === "CHECK_REQUIRED";
    if (isGap) gapCountByRequirement.set(requirement.id, (gapCountByRequirement.get(requirement.id) ?? 0) + 1);
    if (requirement.category === "QUALIFICATION") {
      qualTotal += 1;
      if (isGap) qualGap += 1;
    }
    if (requirement.category === "SKILL") {
      skillTotal += 1;
      if (isGap) skillGap += 1;
    }
  }
  const topGapRequirements = [...gapCountByRequirement.entries()]
    .map(([requirementId, gapCount]) => ({
      requirementId,
      requirementName: requirementById.get(requirementId)?.name ?? requirementId,
      gapCount,
    }))
    .sort((a, b) => b.gapCount - a.gapCount)
    .slice(0, 8);

  // "Resume 부족률"은 분석 시점 히스토리가 아니라 현재 대표이력서 완성도 기준 근사치다 (V1 단순화).
  const uniqueUserIds = [...new Set(analyses.map((a) => a.userId))];
  const resumeChecks = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const resumes = await listResumesForUser(userId);
      const primary = resumes.find((r) => r.isPrimary) ?? resumes[0];
      return !primary || primary.completeness < 50;
    }),
  );
  const resumeDeficiencyRatePercent =
    uniqueUserIds.length > 0 ? Math.round((resumeChecks.filter(Boolean).length / uniqueUserIds.length) * 100) : 0;

  return {
    totalAnalyses: analyses.length,
    uniqueUserCount,
    averageReadinessScore,
    byTarget,
    topGapRequirements,
    qualificationDeficiencyRatePercent: qualTotal > 0 ? Math.round((qualGap / qualTotal) * 100) : 0,
    skillDeficiencyRatePercent: skillTotal > 0 ? Math.round((skillGap / skillTotal) * 100) : 0,
    resumeDeficiencyRatePercent,
  };
}

export interface ContentOpportunityRow {
  requirementId: string;
  requirementName: string;
  mentionRate: number;
  hasContent: boolean;
}

/**
 * 관리자용 Content Opportunity (스펙 41번).
 * 시장 요구율은 높지만 현재 Content Catalog에 연결되는 콘텐츠가 없는 항목을 찾는다.
 * 사용자에게 상품 추천으로 노출하지 않고, 내부 콘텐츠 기획 참고용으로만 사용한다.
 */
export async function findContentOpportunities(
  snapshot: MarketRequirementSnapshot,
  minMentionRate = 20,
): Promise<ContentOpportunityRow[]> {
  const requirements = await getCareerRequirementRepository().findAll({ status: "active" });
  const requirementById = new Map(requirements.map((r) => [r.id, r]));

  const rows: ContentOpportunityRow[] = [];
  for (const stat of snapshot.requirements) {
    if (stat.mentionRate < minMentionRate) continue;
    const requirement = requirementById.get(stat.requirementId);
    if (!requirement) continue;
    const content = await findRecommendedContent(requirement);
    rows.push({
      requirementId: requirement.id,
      requirementName: requirement.name,
      mentionRate: stat.mentionRate,
      hasContent: Boolean(content),
    });
  }
  return rows.sort((a, b) => b.mentionRate - a.mentionRate);
}
