import {
  findCareerProfileByUserId,
  getCareerGapRepository,
  getCareerRequirementRepository,
  getContentRepository,
  getEmploymentDestinationRepository,
  getJobRepository,
  getOccupationRepository,
} from "@/lib/repositories";
import { evaluateJobFit } from "./job-match.service";
import { getRelevantJobsForScope, getOrComputeMarketSnapshot } from "./market-requirement.service";
import { computeUserRequirementStatuses } from "./user-requirement-status.service";
import { listResumesForUser } from "./resume.service";
import { listCoverLettersForUser, getCoverLetterDetail } from "./cover-letter.service";
import { textMentionsRequirement } from "@/lib/career-gap/requirement-normalizer";
import { ELIGIBLE_JOB_MATCH_THRESHOLD, MIN_SAMPLE_SIZE_FOR_CONFIDENT_DISPLAY, MULTI_CONDITION_SIMULATION_TOP_N, round1 } from "@/lib/career-gap/config";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { isUsingMockJobProvider } from "@/features/jobs/providers";
import { recalculateLeadScore } from "./lead-score.service";
import type {
  CareerGapItemInput,
  CareerGapItemView,
  CareerGapRecommendation,
  CareerGapRequirement,
  CareerGapResultView,
  CareerGapSummary,
  CareerProfile,
  CoverLetterGapNote,
  EligibleJobSummary,
  Job,
  MultiConditionSimulationResult,
  ResumeGapNote,
  UserRequirementStatus,
} from "@/types";

/** /career-gap/[id] 결과 재조회. Counterfactual/추천은 저장된 값을 그대로 복원한다 (재계산하지 않음). */
export async function getCareerGapResult(analysisId: string): Promise<CareerGapResultView | null> {
  const repo = getCareerGapRepository();
  const analysis = await repo.findAnalysisById(analysisId);
  if (!analysis) return null;

  const [items, requirements, occupation, destination, targetJob] = await Promise.all([
    repo.findItemsByAnalysisId(analysisId),
    getCareerRequirementRepository().findAll(),
    analysis.occupationId ? getOccupationRepository().findById(analysis.occupationId) : Promise.resolve(null),
    analysis.employmentDestinationId ? getEmploymentDestinationRepository().findById(analysis.employmentDestinationId) : Promise.resolve(null),
    analysis.targetJobId ? getJobRepository().findById(analysis.targetJobId) : Promise.resolve(null),
  ]);
  const requirementById = new Map(requirements.map((r) => [r.id, r]));

  const [userResultMap] = await Promise.all([computeUserRequirementStatuses(analysis.userId, requirements)]);

  const itemViews: CareerGapItemView[] = items.map((item) => {
    const requirement = requirementById.get(item.requirementId);
    const resumeGapNote = userResultMap.get(item.requirementId)?.resumeGapNote;
    return {
      ...item,
      requirementKey: requirement?.key ?? "unknown",
      requirementName: requirement?.name ?? "알 수 없는 조건",
      requirementCategory: requirement?.category ?? "OTHER",
      preparationDifficulty: requirement?.preparationDifficulty ?? "MEDIUM",
      relatedJobSampleSize: analysis.marketSampleSize,
      relatedJobMatchCount: Math.round((item.marketMentionRate / 100) * analysis.marketSampleSize),
      resumeGapNote,
    };
  });

  const wellPreparedItems = itemViews.filter((i) => i.userStatus === "SATISFIED").sort((a, b) => b.importanceScore - a.importanceScore);
  const improvementItems = itemViews
    .filter((i) => i.userStatus !== "SATISFIED" && i.marketMentionRate > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const resumeGapNotes = itemViews.map((i) => i.resumeGapNote).filter((n): n is ResumeGapNote => Boolean(n));

  const [profile, scopeJobs] = await Promise.all([
    findCareerProfileByUserId(analysis.userId),
    getRelevantJobsForScope({ occupationId: analysis.occupationId, destinationId: analysis.employmentDestinationId }),
  ]);
  const eligibleJobs: EligibleJobSummary[] = profile
    ? scopeJobs
        .map((job) => ({ job, score: evaluateJobFit(profile, job)?.score ?? 0 }))
        .filter((x) => x.score >= ELIGIBLE_JOB_MATCH_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((x) => ({ jobId: x.job.id, title: x.job.title, companyName: x.job.companyName, matchScore: x.score }))
    : [];

  const recommendations: CareerGapRecommendation[] = [];
  for (const item of improvementItems.slice(0, 6)) {
    const requirement = requirementById.get(item.requirementId);
    if (!requirement) continue;
    const content = await findRecommendedContent(requirement);
    if (content) {
      recommendations.push({
        requirementId: requirement.id,
        requirementName: requirement.name,
        kind: requirement.category === "QUALIFICATION" ? "QUALIFICATION" : requirement.category === "EXPERIENCE" ? "TRAINING" : "SKILL",
        title: content.title,
        description: content.description,
        contentId: content.contentId,
        marketRate: item.marketMentionRate,
        projectedEligibleJobCount: item.projectedEligibleJobCount,
      });
    }
  }

  return {
    analysisId: analysis.id,
    occupationId: analysis.occupationId,
    occupationName: occupation?.name,
    destinationId: analysis.employmentDestinationId,
    destinationName: destination?.name,
    targetJobId: analysis.targetJobId,
    targetJobTitle: targetJob?.title,
    readinessScore: analysis.readinessScore,
    marketSampleSize: analysis.marketSampleSize,
    confidence: analysis.confidence,
    isDataSufficient: analysis.marketSampleSize >= MIN_SAMPLE_SIZE_FOR_CONFIDENT_DISPLAY,
    isMockData: isUsingMockJobProvider(),
    currentEligibleJobCount: analysis.currentEligibleJobCount,
    wellPreparedItems,
    improvementItems,
    topPriorityItem: improvementItems[0],
    recommendations,
    eligibleJobs,
    multiConditionSimulations: [],
    resumeGapNotes,
    coverLetterGapNotes: [],
    createdAt: analysis.createdAt,
  };
}

export interface RunCareerGapAnalysisParams {
  userId: string;
  occupationId: string;
  employmentDestinationId?: string;
  targetJobId?: string;
}

function difficultyModifier(difficulty: CareerGapRequirement["preparationDifficulty"]): number {
  if (difficulty === "LOW") return 1.3;
  if (difficulty === "HIGH") return 0.7;
  return 1.0;
}

function computeImportanceScore(requiredRate: number, preferredRate: number, mentionRate: number): number {
  return round1(Math.min(100, requiredRate * 1.2 + preferredRate * 0.7 + mentionRate * 0.3));
}

function statusBaseScore(status: UserRequirementStatus): number {
  switch (status) {
    case "SATISFIED":
      return 100;
    case "CHECK_REQUIRED":
      return 60;
    case "UNKNOWN":
      return 40;
    default:
      return 0;
  }
}

/**
 * Counterfactual Simulation을 위해 "이 Requirement를 충족했다고 가정"한 프로필을 만든다 (스펙 17번).
 * evaluateJobFit이 실제로 참조하는 필드(canDrive/heldQualifications/interestTags)만 패치하며,
 * 새로운 매칭 로직을 만들지 않고 기존 Job Match Engine을 그대로 재사용한다.
 * job-curation 자격 탭에서 재사용한다.
 */
export function buildHypotheticalProfile(profile: CareerProfile, requirement: CareerGapRequirement): CareerProfile {
  if (requirement.matchingType === "DRIVING_FLAG") {
    return { ...profile, canDrive: true };
  }
  if (requirement.matchingType === "QUALIFICATION") {
    return { ...profile, heldQualifications: [...new Set([...(profile.heldQualifications ?? []), requirement.name])] };
  }
  return { ...profile, interestTags: [...new Set([...(profile.interestTags ?? []), requirement.name])] };
}

function countEligibleJobs(profile: CareerProfile | undefined, jobs: Job[]): number {
  if (!profile) return 0;
  return jobs.filter((job) => (evaluateJobFit(profile, job)?.score ?? 0) >= ELIGIBLE_JOB_MATCH_THRESHOLD).length;
}

/** 관리자 Content Opportunity(스펙 41번)에서도 재사용하므로 export한다. */
export async function findRecommendedContent(requirement: CareerGapRequirement): Promise<{ contentId: string; title: string; description: string } | null> {
  const contents = await getContentRepository().findAll({ status: "published" });
  const match = contents.find((content) => {
    if (content.requiredQualifications.some((q) => q.includes(requirement.name) || requirement.name.includes(q))) return true;
    if ((requirement.relatedContentTags ?? []).some((tag) => content.tags.includes(tag))) return true;
    return requirement.detectionKeywords.some((keyword) => content.tags.some((tag) => tag.includes(keyword) || keyword.includes(tag)));
  });
  if (!match) return null;
  return { contentId: match.id, title: match.title, description: match.summary ?? match.shortDescription ?? match.description };
}

async function computeCoverLetterGapNotes(
  userId: string,
  satisfiedInterpersonalRequirements: CareerGapRequirement[],
): Promise<CoverLetterGapNote[]> {
  const coverLetters = await listCoverLettersForUser(userId);
  const primary = coverLetters[0];
  if (!primary) return [];
  const detail = await getCoverLetterDetail(primary.id);
  const text = (detail?.sections ?? []).map((s) => s.content).join("\n");
  if (!text.trim()) return [];

  const notes: CoverLetterGapNote[] = [];
  for (const requirement of satisfiedInterpersonalRequirements) {
    if (requirement.category !== "SKILL" && requirement.category !== "EXPERIENCE") continue;
    if (!textMentionsRequirement(text, requirement)) {
      notes.push({
        requirementId: requirement.id,
        requirementName: requirement.name,
        message: `지원 직무와 관련된 '${requirement.name}' 경험이 있으나 자기소개서에는 반영되지 않았습니다.`,
      });
    }
    if (notes.length >= 3) break;
  }
  return notes;
}

/**
 * Career Gap Engine 메인 오케스트레이션 (스펙 1/14번).
 * 시장 통계(Rule/DB Engine) -> 사용자 상태 비교 -> 준비도/우선순위/Counterfactual 계산 -> 결과 저장까지 수행한다.
 * 핵심 수치(rate/score/projected count)는 전부 이 함수 안의 결정론적 계산에서 나오고, AI는 개입하지 않는다 (스펙 49번).
 */
export async function runCareerGapAnalysis(params: RunCareerGapAnalysisParams): Promise<CareerGapResultView> {
  const { userId, occupationId, employmentDestinationId, targetJobId } = params;

  await logActivityEvent({
    userId,
    eventType: "career_gap_analysis_started",
    entityType: "career_gap_analysis",
    metadata: { occupationId, destinationId: employmentDestinationId },
  });

  const [occupation, destination, targetJob, snapshot, requirements, profile, resumes] = await Promise.all([
    getOccupationRepository().findById(occupationId),
    employmentDestinationId ? getEmploymentDestinationRepository().findById(employmentDestinationId) : Promise.resolve(null),
    targetJobId ? getJobRepository().findById(targetJobId) : Promise.resolve(null),
    getOrComputeMarketSnapshot({ occupationId, destinationId: employmentDestinationId }),
    getCareerRequirementRepository().findAll({ status: "active" }),
    findCareerProfileByUserId(userId),
    listResumesForUser(userId),
  ]);

  const requirementById = new Map(requirements.map((r) => [r.id, r]));
  const scopeJobs = await getRelevantJobsForScope({ occupationId, destinationId: employmentDestinationId });
  const baselineEligibleCount = countEligibleJobs(profile ?? undefined, scopeJobs);

  const statusMap = await computeUserRequirementStatuses(userId, requirements);

  const itemViews: CareerGapItemView[] = [];
  const itemInputs: CareerGapItemInput[] = [];
  const resumeGapNotes: ResumeGapNote[] = [];

  let orderIndex = 0;
  for (const stat of snapshot.requirements) {
    const requirement = requirementById.get(stat.requirementId);
    if (!requirement) continue;

    const userResult = statusMap.get(requirement.id) ?? { status: "UNKNOWN" as UserRequirementStatus };
    const importanceScore = computeImportanceScore(stat.requiredRate, stat.preferredRate, stat.mentionRate);

    let projectedEligibleJobCount: number | undefined;
    let gapScore = 0;
    if (userResult.status !== "SATISFIED" && profile) {
      const hypothetical = buildHypotheticalProfile(profile, requirement);
      projectedEligibleJobCount = countEligibleJobs(hypothetical, scopeJobs);
      gapScore = Math.max(0, projectedEligibleJobCount - baselineEligibleCount);
    } else if (userResult.status === "SATISFIED") {
      projectedEligibleJobCount = baselineEligibleCount;
    }

    const priorityScore =
      userResult.status === "SATISFIED"
        ? 0
        : round1(importanceScore * (1 + gapScore / 5) * difficultyModifier(requirement.preparationDifficulty));

    const reason =
      stat.mentionRate > 0
        ? `분석된 관련 공고 중 ${stat.mentionRate}%가 '${requirement.name}'을 요구하거나 언급합니다.`
        : `분석된 관련 공고에서 '${requirement.name}'에 대한 언급은 아직 확인되지 않았습니다.`;

    if (userResult.resumeGapNote) resumeGapNotes.push(userResult.resumeGapNote);

    const relatedJobMatchCount = Math.round((stat.mentionRate / 100) * snapshot.sampleSize);

    itemViews.push({
      id: `pending-${requirement.id}`,
      analysisId: "pending",
      requirementId: requirement.id,
      marketRequiredRate: stat.requiredRate,
      marketPreferredRate: stat.preferredRate,
      marketMentionRate: stat.mentionRate,
      userStatus: userResult.status,
      importanceScore,
      gapScore,
      priorityScore,
      projectedEligibleJobCount,
      reason,
      orderIndex: orderIndex++,
      createdAt: new Date().toISOString(),
      requirementKey: requirement.key,
      requirementName: requirement.name,
      requirementCategory: requirement.category,
      preparationDifficulty: requirement.preparationDifficulty,
      relatedJobSampleSize: snapshot.sampleSize,
      relatedJobMatchCount,
      resumeGapNote: userResult.resumeGapNote,
    });

    itemInputs.push({
      analysisId: "pending",
      requirementId: requirement.id,
      marketRequiredRate: stat.requiredRate,
      marketPreferredRate: stat.preferredRate,
      marketMentionRate: stat.mentionRate,
      userStatus: userResult.status,
      importanceScore,
      gapScore,
      priorityScore,
      projectedEligibleJobCount,
      reason,
      orderIndex: orderIndex - 1,
    });
  }

  const wellPreparedItems = itemViews.filter((item) => item.userStatus === "SATISFIED").sort((a, b) => b.importanceScore - a.importanceScore);
  const improvementItems = itemViews
    .filter((item) => item.userStatus !== "SATISFIED" && item.marketMentionRate > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore);
  const topPriorityItem = improvementItems[0];

  // 복수 조건 Simulation (스펙 18번) - TOP N Gap까지만, 조합폭발 방지
  const topGapRequirements = improvementItems
    .slice(0, MULTI_CONDITION_SIMULATION_TOP_N)
    .map((item) => requirementById.get(item.requirementId))
    .filter((r): r is CareerGapRequirement => Boolean(r));

  const multiConditionSimulations: MultiConditionSimulationResult[] = [];
  if (profile && topGapRequirements.length >= 2) {
    for (let i = 0; i < topGapRequirements.length; i++) {
      for (let j = i + 1; j < topGapRequirements.length; j++) {
        const combo = [topGapRequirements[i], topGapRequirements[j]];
        const hypothetical = combo.reduce((p, req) => buildHypotheticalProfile(p, req), profile);
        const count = countEligibleJobs(hypothetical, scopeJobs);
        multiConditionSimulations.push({
          requirementIds: combo.map((r) => r.id),
          label: combo.map((r) => r.name).join(" + "),
          eligibleJobCount: count,
          deltaFromBaseline: Math.max(0, count - baselineEligibleCount),
        });
      }
    }
    if (topGapRequirements.length === MULTI_CONDITION_SIMULATION_TOP_N) {
      const hypothetical = topGapRequirements.reduce((p, req) => buildHypotheticalProfile(p, req), profile);
      const count = countEligibleJobs(hypothetical, scopeJobs);
      multiConditionSimulations.push({
        requirementIds: topGapRequirements.map((r) => r.id),
        label: topGapRequirements.map((r) => r.name).join(" + "),
        eligibleJobCount: count,
        deltaFromBaseline: Math.max(0, count - baselineEligibleCount),
      });
    }
  }

  // 추가 준비 추천 (스펙 20/21/22번) - 시장 데이터와 실제로 연결될 때만 노출
  const recommendations: CareerGapRecommendation[] = [];
  for (const item of improvementItems.slice(0, 6)) {
    const requirement = requirementById.get(item.requirementId);
    if (!requirement) continue;
    const content = await findRecommendedContent(requirement);
    if (content) {
      recommendations.push({
        requirementId: requirement.id,
        requirementName: requirement.name,
        kind: requirement.category === "QUALIFICATION" ? "QUALIFICATION" : requirement.category === "EXPERIENCE" ? "TRAINING" : "SKILL",
        title: content.title,
        description: content.description,
        contentId: content.contentId,
        marketRate: item.marketMentionRate,
        projectedEligibleJobCount: item.projectedEligibleJobCount,
      });
    }
  }
  for (const note of resumeGapNotes.slice(0, 3)) {
    recommendations.push({
      requirementId: note.requirementId,
      requirementName: note.requirementName,
      kind: "RESUME",
      title: "이력서에 이 경험을 추가해보세요",
      description: note.message,
      marketRate: itemViews.find((i) => i.requirementId === note.requirementId)?.marketMentionRate ?? 0,
    });
  }

  // 준비도 Score (스펙 15번) - 시장 중요도로 가중한 충족률 + 이력서 준비상태를 함께 반영한다.
  const weightSum = itemViews.reduce((sum, item) => sum + Math.max(1, item.importanceScore), 0);
  const weightedScoreSum = itemViews.reduce((sum, item) => sum + Math.max(1, item.importanceScore) * statusBaseScore(item.userStatus), 0);
  const requirementReadiness = itemViews.length > 0 ? weightedScoreSum / weightSum : 50;
  const primaryResume = resumes.find((r) => r.isPrimary) ?? resumes[0];
  const resumeReadiness = primaryResume?.completeness ?? 0;
  const readinessScore = Math.max(0, Math.min(100, Math.round(requirementReadiness * 0.85 + resumeReadiness * 0.15)));

  const isDataSufficient = snapshot.sampleSize >= MIN_SAMPLE_SIZE_FOR_CONFIDENT_DISPLAY;

  const eligibleJobs: EligibleJobSummary[] = profile
    ? scopeJobs
        .map((job) => ({ job, score: evaluateJobFit(profile, job)?.score ?? 0 }))
        .filter((x) => x.score >= ELIGIBLE_JOB_MATCH_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((x) => ({ jobId: x.job.id, title: x.job.title, companyName: x.job.companyName, matchScore: x.score }))
    : [];

  const satisfiedInterpersonal = wellPreparedItems
    .map((item) => requirementById.get(item.requirementId))
    .filter((r): r is CareerGapRequirement => Boolean(r));
  const coverLetterGapNotes = await computeCoverLetterGapNotes(userId, satisfiedInterpersonal);

  const { analysis, items } = await getCareerGapRepository().createAnalysis(
    {
      userId,
      occupationId,
      employmentDestinationId,
      targetJobId,
      marketSampleSize: snapshot.sampleSize,
      confidence: snapshot.confidence,
      readinessScore,
      currentEligibleJobCount: baselineEligibleCount,
    },
    itemInputs,
  );

  const itemViewByRequirementId = new Map(itemViews.map((v) => [v.requirementId, v]));
  const finalItemViews: CareerGapItemView[] = items.map((item) => {
    const view = itemViewByRequirementId.get(item.requirementId);
    return { ...(view as CareerGapItemView), ...item };
  });

  await logActivityEvent({
    userId,
    eventType: "career_gap_analysis_completed",
    entityType: "career_gap_analysis",
    entityId: analysis.id,
    metadata: {
      occupationId,
      destinationId: employmentDestinationId,
      readinessScore,
      sampleSize: snapshot.sampleSize,
    },
  });
  await recalculateLeadScore(userId);

  return {
    analysisId: analysis.id,
    occupationId,
    occupationName: occupation?.name,
    destinationId: employmentDestinationId,
    destinationName: destination?.name,
    targetJobId,
    targetJobTitle: targetJob?.title,
    readinessScore,
    marketSampleSize: snapshot.sampleSize,
    confidence: snapshot.confidence,
    isDataSufficient,
    isMockData: snapshot.isMockData,
    currentEligibleJobCount: baselineEligibleCount,
    wellPreparedItems: finalItemViews.filter((i) => i.userStatus === "SATISFIED"),
    improvementItems: finalItemViews.filter((i) => i.userStatus !== "SATISFIED" && i.marketMentionRate > 0).sort((a, b) => b.priorityScore - a.priorityScore),
    topPriorityItem: finalItemViews.find((i) => i.requirementId === topPriorityItem?.requirementId),
    recommendations,
    eligibleJobs,
    multiConditionSimulations,
    resumeGapNotes,
    coverLetterGapNotes,
    createdAt: analysis.createdAt,
  };
}

/** 마이페이지 "취업 준비도" 카드 / 관리자 CRM에서 사용하는 요약 목록. */
export async function listCareerGapSummariesForUser(userId: string, limit = 5): Promise<CareerGapSummary[]> {
  const repo = getCareerGapRepository();
  const analyses = await repo.findAnalysesByUserId(userId, limit);
  if (analyses.length === 0) return [];

  const [occupations, destinations, requirements] = await Promise.all([
    getOccupationRepository().findAll(),
    getEmploymentDestinationRepository().findAll(),
    getCareerRequirementRepository().findAll(),
  ]);
  const occupationById = new Map(occupations.map((o) => [o.id, o]));
  const destinationById = new Map(destinations.map((d) => [d.id, d]));
  const requirementById = new Map(requirements.map((r) => [r.id, r]));

  const summaries: CareerGapSummary[] = [];
  for (const analysis of analyses) {
    const items = await repo.findItemsByAnalysisId(analysis.id);
    const topGap = [...items]
      .filter((i) => i.userStatus !== "SATISFIED" && i.marketMentionRate > 0)
      .sort((a, b) => b.priorityScore - a.priorityScore)[0];
    summaries.push({
      id: analysis.id,
      occupationName: analysis.occupationId ? occupationById.get(analysis.occupationId)?.name : undefined,
      destinationName: analysis.employmentDestinationId ? destinationById.get(analysis.employmentDestinationId)?.name : undefined,
      readinessScore: analysis.readinessScore,
      topGapName: topGap ? requirementById.get(topGap.requirementId)?.name : undefined,
      currentEligibleJobCount: analysis.currentEligibleJobCount,
      createdAt: analysis.createdAt,
    });
  }
  return summaries;
}
