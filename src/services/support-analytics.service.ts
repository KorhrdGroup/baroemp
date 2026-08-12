import { activityEventLogger } from "@/lib/activity/event-logger";
import { getLeadRepository, getSupportAssessmentSessionRepository } from "@/lib/repositories";
import { labelAgeGroup, labelRegion } from "@/lib/labels";

function topN(items: string[], n: number): { key: string; count: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    if (!item) continue;
    map.set(item, (map.get(item) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export interface SupportAnalyticsSnapshot {
  searchStartedCount: number;
  searchCompletedCount: number;
  completionRatePercent: number;
  viewCount: number;
  bookmarkCount: number;
  applyClickCount: number;
  topCategories: { key: string; count: number }[];
  topPrograms: { key: string; count: number }[];
  topAgeGroups: { key: string; count: number }[];
  topRegions: { key: string; count: number }[];
  trainingInterestCount: number;
  avgLeadScoreOfCompletedUsers: number;
}

/**
 * /admin/analytics "지원금 지표" 섹션용 (스펙 23번).
 * job-analytics.service.ts와 동일한 철학: Mock 배열이 아닌 실제 activity_events /
 * support_assessment_sessions / leads를 집계한다.
 */
export async function getSupportAnalyticsSnapshot(): Promise<SupportAnalyticsSnapshot> {
  const [events, completedSessions, leads] = await Promise.all([
    activityEventLogger.getRecentEvents(3000),
    getSupportAssessmentSessionRepository().findAll({ status: "completed" }),
    getLeadRepository().findAll(),
  ]);

  const supportEvents = events.filter((e) => e.entityType === "support_program" || e.eventType.startsWith("support_"));

  const searchStartedCount = supportEvents.filter((e) => e.eventType === "support_search_started").length;
  const searchCompletedCount = supportEvents.filter((e) => e.eventType === "support_search_completed").length;
  const completionRatePercent =
    searchStartedCount > 0 ? Math.round((searchCompletedCount / searchStartedCount) * 100) : 0;

  const viewCount = supportEvents.filter((e) => e.eventType === "support_viewed").length;
  const bookmarkCount = supportEvents.filter((e) => e.eventType === "support_bookmarked").length;
  const applyClickCount = supportEvents.filter((e) => e.eventType === "support_apply_clicked").length;

  const topCategories = topN(
    supportEvents
      .filter((e) => e.eventType === "support_viewed" || e.eventType === "support_match_viewed")
      .map((e) => String(e.metadata?.category ?? "")),
    5,
  );
  const topPrograms = topN(
    supportEvents
      .filter((e) => e.eventType === "support_viewed")
      .map((e) => String(e.metadata?.title ?? "")),
    5,
  );

  const ageGroupCounts = topN(
    completedSessions.map((s) => (s.answers.ageGroup ? labelAgeGroup(s.answers.ageGroup) : "")),
    6,
  );
  const regionCounts = topN(
    completedSessions.map((s) => (s.answers.region ? labelRegion(s.answers.region) : "")),
    17,
  );

  const trainingInterestCount = completedSessions.filter((s) => (s.answers.trainingWillingness ?? 0) >= 4).length;

  const completedUserIds = new Set(completedSessions.map((s) => s.userId).filter((id): id is string => Boolean(id)));
  const leadScores = leads.filter((l) => completedUserIds.has(l.userId)).map((l) => l.score.totalScore);
  const avgLeadScoreOfCompletedUsers =
    leadScores.length > 0 ? Math.round(leadScores.reduce((sum, s) => sum + s, 0) / leadScores.length) : 0;

  return {
    searchStartedCount,
    searchCompletedCount,
    completionRatePercent,
    viewCount,
    bookmarkCount,
    applyClickCount,
    topCategories,
    topPrograms,
    topAgeGroups: ageGroupCounts,
    topRegions: regionCounts,
    trainingInterestCount,
    avgLeadScoreOfCompletedUsers,
  };
}
