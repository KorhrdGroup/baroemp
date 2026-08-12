import { activityEventLogger } from "@/lib/activity/event-logger";
import { getSupportAssessmentSessionRepository, getSupportBookmarkRepository } from "@/lib/repositories";
import { SUPPORT_TAG_REPEAT_THRESHOLD } from "@/lib/support/support-tag-rules";
import type { ActivityEvent, SupportBehaviorTopItem, UserSupportBehaviorSummary } from "@/types";

const RECENT_DAYS = 7;

function isWithinRecentDays(occurredAt: string, days: number): boolean {
  const diff = Date.now() - new Date(occurredAt).getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function tally(items: string[]): SupportBehaviorTopItem[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!item) continue;
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 관리자 회원상세 "지원제도 관심" 섹션용 요약.
 * job-behavior-summary.service.ts와 동일한 철학: Activity Event(원본 행동) +
 * support_bookmarks(찜)/support_assessment_sessions(진단 완료 여부)를 함께 읽어 요약한다.
 */
export async function getUserSupportBehaviorSummary(userId: string): Promise<UserSupportBehaviorSummary> {
  const [events, bookmarks, sessions] = await Promise.all([
    activityEventLogger.getEventsByUser(userId),
    getSupportBookmarkRepository().findAllByUser(userId),
    getSupportAssessmentSessionRepository().findAll({ userId, status: "completed" }),
  ]);

  const supportEvents = events.filter(
    (e): e is ActivityEvent => e.entityType === "support_program" || e.eventType.startsWith("support_"),
  );

  const recentViewCount = supportEvents.filter(
    (e) => e.eventType === "support_viewed" && isWithinRecentDays(e.occurredAt, RECENT_DAYS),
  ).length;
  const applyClickCount = supportEvents.filter((e) => e.eventType === "support_apply_clicked").length;

  const highEligibilityProgramIds = new Set(
    supportEvents
      .filter((e) => e.eventType === "support_match_viewed" && e.metadata?.eligibilityGrade === "HIGH")
      .map((e) => e.entityId ?? (typeof e.metadata?.supportProgramId === "string" ? e.metadata.supportProgramId : ""))
      .filter(Boolean),
  );

  const topCategories = tally(
    supportEvents
      .filter((e) => e.eventType === "support_viewed" || e.eventType === "support_match_viewed")
      .map((e) => (typeof e.metadata?.category === "string" ? e.metadata.category : "")),
  ).slice(0, 5);

  const topPrograms = tally(
    supportEvents
      .filter((e) => e.eventType === "support_viewed")
      .map((e) => {
        const title = typeof e.metadata?.title === "string" ? e.metadata.title : undefined;
        return title ?? e.entityId ?? "";
      }),
  ).slice(0, 5);

  const trainingInterest = (topCategories.find((c) => c.label === "training")?.count ?? 0) >= SUPPORT_TAG_REPEAT_THRESHOLD;
  const regionalInterest = (topCategories.find((c) => c.label === "regional")?.count ?? 0) >= SUPPORT_TAG_REPEAT_THRESHOLD;

  const sortedSessions = [...sessions].sort((a, b) => ((a.completedAt ?? "") < (b.completedAt ?? "") ? 1 : -1));

  return {
    hasCompletedAssessment: sortedSessions.length > 0,
    lastAssessmentCompletedAt: sortedSessions[0]?.completedAt,
    highEligibilityCount: highEligibilityProgramIds.size,
    recentViewCount,
    bookmarkCount: bookmarks.length,
    applyClickCount,
    topCategories,
    topPrograms,
    trainingInterest,
    regionalInterest,
  };
}
