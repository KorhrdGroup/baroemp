import { activityEventLogger } from "@/lib/activity/event-logger";
import { getAssessmentResultRepository, getJobInterestRepository } from "@/lib/repositories";

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

export interface JobAnalyticsSnapshot {
  searchUserCount: number;
  jobViewCount: number;
  bookmarkCount: number;
  applyClickCount: number;
  topSearchKeywords: { key: string; count: number }[];
  topSearchRegions: { key: string; count: number }[];
  topBookmarkedOccupations: { key: string; count: number }[];
  topAppliedOccupations: { key: string; count: number }[];
  assessmentToJobMatchRate: { matched: number; total: number; ratePercent: number };
}

/**
 * /admin/analytics "채용 지표" 섹션용. 실제 activity_events / user_job_interests / assessment_results를
 * 집계한다 (analytics.service.ts의 나머지 KPI와 달리 Mock 배열이 아닌 실제 Repository/Logger를 사용).
 */
export async function getJobAnalyticsSnapshot(): Promise<JobAnalyticsSnapshot> {
  const events = await activityEventLogger.getRecentEvents(3000);
  const jobEvents = events.filter((e) => e.entityType === "job" || e.eventType.startsWith("job_"));

  const searchUsers = new Set(
    jobEvents.filter((e) => e.eventType === "job_search_performed").map((e) => e.userId ?? e.anonymousId ?? ""),
  );
  searchUsers.delete("");

  const jobViewCount = jobEvents.filter((e) => e.eventType === "job_detail_viewed").length;
  const bookmarkCount = jobEvents.filter((e) => e.eventType === "job_bookmarked").length;
  const applyClickCount = jobEvents.filter((e) => e.eventType === "job_apply_clicked").length;

  const topSearchKeywords = topN(
    jobEvents
      .filter((e) => e.eventType === "job_search_performed")
      .map((e) => (typeof e.metadata?.searchKeyword === "string" ? e.metadata.searchKeyword.trim() : "")),
    5,
  );
  const topSearchRegions = topN(
    jobEvents
      .filter((e) => e.eventType === "job_search_performed")
      .map((e) => {
        const filter = e.metadata?.filter as Record<string, unknown> | undefined;
        return typeof filter?.region === "string" ? filter.region : "";
      }),
    5,
  );
  const topBookmarkedOccupations = topN(
    jobEvents.filter((e) => e.eventType === "job_bookmarked").map((e) => String(e.metadata?.jobCategory ?? "")),
    5,
  );
  const topAppliedOccupations = topN(
    jobEvents.filter((e) => e.eventType === "job_apply_clicked").map((e) => String(e.metadata?.jobCategory ?? "")),
    5,
  );

  // 직업검사 추천 vs 실제 조회 직업 일치율: 검사를 완료한 사용자 중 TOP1 추천 직종과
  // 실제 Job Behavior 관심 TOP1 직종(occupationId=jobCategory)이 같은 비율.
  const [allResults, allInterests] = await Promise.all([
    getAssessmentResultRepository().findAll(),
    getJobInterestRepository().findAll(),
  ]);

  const latestResultByUser = new Map<string, { jobCategoryCode: string; completedAt: string }>();
  for (const result of allResults) {
    if (!result.userId) continue;
    const top = result.recommendations[0];
    if (!top?.jobCategoryCode) continue;
    const prev = latestResultByUser.get(result.userId);
    if (!prev || result.completedAt > prev.completedAt) {
      latestResultByUser.set(result.userId, { jobCategoryCode: top.jobCategoryCode, completedAt: result.completedAt });
    }
  }

  const topBehaviorByUser = new Map<string, string>();
  const behaviorByUser = new Map<string, { occupationId: string; score: number }[]>();
  for (const interest of allInterests) {
    if (!interest.userId || interest.source !== "JOB_BEHAVIOR") continue;
    const list = behaviorByUser.get(interest.userId) ?? [];
    list.push({ occupationId: interest.occupationId, score: interest.interestScore });
    behaviorByUser.set(interest.userId, list);
  }
  for (const [userId, list] of behaviorByUser) {
    const top = [...list].sort((a, b) => b.score - a.score)[0];
    if (top) topBehaviorByUser.set(userId, top.occupationId);
  }

  let matched = 0;
  let total = 0;
  for (const [userId, { jobCategoryCode }] of latestResultByUser) {
    const behaviorTop = topBehaviorByUser.get(userId);
    if (!behaviorTop) continue;
    total += 1;
    if (behaviorTop === jobCategoryCode) matched += 1;
  }

  return {
    searchUserCount: searchUsers.size,
    jobViewCount,
    bookmarkCount,
    applyClickCount,
    topSearchKeywords,
    topSearchRegions,
    topBookmarkedOccupations,
    topAppliedOccupations,
    assessmentToJobMatchRate: {
      matched,
      total,
      ratePercent: total > 0 ? Math.round((matched / total) * 100) : 0,
    },
  };
}
