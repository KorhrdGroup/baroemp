import { activityEventLogger } from "@/lib/activity/event-logger";
import { getJobProvider, isUsingMockJobProvider } from "@/features/jobs/providers";
import { getJobRepository, getJobSyncRunRepository } from "@/lib/repositories";
import type { Job, JobSyncRun } from "@/types";

export interface AdminJobRow extends Job {
  viewCount: number;
  bookmarkCount: number;
  applyClickCount: number;
}

/**
 * 관리자 /admin/jobs 목록용. Activity Event를 entityId(jobId) 기준으로 집계해
 * 조회수/찜수/지원클릭수를 함께 보여준다.
 * 대량 이벤트를 고려해 최근 N건까지만 집계한다(STEP4 V1 범위, 대시보드형 근사치).
 */
export async function listAdminJobsWithStats(): Promise<AdminJobRow[]> {
  // 전량 수집(6만+건) 이후 전체 findAll은 statement timeout을 유발한다.
  // 관리자 목록은 최신 500건까지만 보여준다 (V1 대시보드형 근사치 - 상세 조회는 검색으로).
  const [searchResult, events] = await Promise.all([
    getJobRepository().search({ activeOnly: false, sort: "latest", page: 1, pageSize: 500 }),
    activityEventLogger.getRecentEvents(3000),
  ]);
  const jobs = searchResult.items;

  const jobEvents = events.filter((e) => e.entityType === "job" && e.entityId);
  const viewCounts = new Map<string, number>();
  const bookmarkCounts = new Map<string, number>();
  const applyCounts = new Map<string, number>();

  for (const e of jobEvents) {
    const id = e.entityId!;
    if (e.eventType === "job_detail_viewed") viewCounts.set(id, (viewCounts.get(id) ?? 0) + 1);
    if (e.eventType === "job_bookmarked") bookmarkCounts.set(id, (bookmarkCounts.get(id) ?? 0) + 1);
    if (e.eventType === "job_unbookmarked") bookmarkCounts.set(id, Math.max(0, (bookmarkCounts.get(id) ?? 0) - 1));
    if (e.eventType === "job_apply_clicked") applyCounts.set(id, (applyCounts.get(id) ?? 0) + 1);
  }

  return jobs
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((job) => ({
      ...job,
      viewCount: viewCounts.get(job.id) ?? 0,
      bookmarkCount: bookmarkCounts.get(job.id) ?? 0,
      applyClickCount: applyCounts.get(job.id) ?? 0,
    }));
}

export interface JobSyncOverview {
  providerName: string;
  isMock: boolean;
  latestRun: JobSyncRun | null;
  recentRuns: JobSyncRun[];
}

/** /admin/jobs 상단 Provider Sync Analytics 영역용. */
export async function getJobSyncOverview(): Promise<JobSyncOverview> {
  const providerName = getJobProvider().getProviderName();
  const isMock = isUsingMockJobProvider();
  const recentRuns = await getJobSyncRunRepository().findAll(10);
  return { providerName, isMock, latestRun: recentRuns[0] ?? null, recentRuns };
}
