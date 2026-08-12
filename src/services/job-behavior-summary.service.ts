import { activityEventLogger } from "@/lib/activity/event-logger";
import { getJobBookmarkRepository, getJobInterestRepository } from "@/lib/repositories";
import type { ActivityEvent, JobBehaviorTopItem, UserJobBehaviorSummary } from "@/types";

const RECENT_DAYS = 7;

function isWithinRecentDays(occurredAt: string, days: number): boolean {
  const diff = Date.now() - new Date(occurredAt).getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function tally(items: string[]): JobBehaviorTopItem[] {
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
 * 관리자 회원상세 "채용 관심" 섹션용 요약.
 * Activity Event(원본 행동)와 user_job_interests(집계된 관심도)를 함께 읽어
 * "최근 7일 조회/찜/지원클릭 + TOP 관심직업/세부관심/검색어/지역"을 만든다.
 */
export async function getUserJobBehaviorSummary(userId: string): Promise<UserJobBehaviorSummary> {
  const [events, jobInterests, bookmarks] = await Promise.all([
    activityEventLogger.getEventsByUser(userId),
    getJobInterestRepository().findAll({ userId }),
    getJobBookmarkRepository().findAllByUser(userId),
  ]);

  const jobEvents = events.filter((e): e is ActivityEvent => e.entityType === "job" || e.eventType.startsWith("job_"));

  const recentViewCount = jobEvents.filter(
    (e) => e.eventType === "job_detail_viewed" && isWithinRecentDays(e.occurredAt, RECENT_DAYS),
  ).length;
  const applyClickCount = jobEvents.filter((e) => e.eventType === "job_apply_clicked").length;

  const behaviorInterests = jobInterests
    .filter((i) => i.source === "JOB_BEHAVIOR")
    .sort((a, b) => b.interestScore - a.interestScore);
  const topInterestOccupations = behaviorInterests
    .slice(0, 5)
    .map((i) => ({ label: i.occupationName, count: i.interestScore }));

  const detailTagCounts = tally(
    jobEvents.flatMap((e) => (Array.isArray(e.metadata?.detailTags) ? (e.metadata!.detailTags as string[]) : [])),
  );

  const searchKeywords = [
    ...new Set(
      jobEvents
        .filter((e) => e.eventType === "job_search_performed")
        .map((e) => (typeof e.metadata?.searchKeyword === "string" ? e.metadata.searchKeyword.trim() : ""))
        .filter(Boolean),
    ),
  ].slice(0, 5);

  const topRegions = tally(
    jobEvents
      .filter((e) => e.eventType === "job_detail_viewed")
      .map((e) => (typeof e.metadata?.region === "string" ? e.metadata.region : "")),
  ).slice(0, 3);

  return {
    recentViewCount,
    bookmarkCount: bookmarks.length,
    applyClickCount,
    topInterestOccupations,
    topDetailTags: detailTagCounts.slice(0, 5),
    searchKeywords,
    topRegions,
  };
}
