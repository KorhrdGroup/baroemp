import { activityEventLogger } from "@/lib/activity/event-logger";
import { getSupportProvider, isUsingMockSupportProvider } from "@/features/support/providers";
import { getSupportProgramRepository, getSupportSyncRunRepository } from "@/lib/repositories";
import type { SupportProgram, SupportSyncRun } from "@/types";

export interface AdminSupportRow extends SupportProgram {
  viewCount: number;
  bookmarkCount: number;
  applyClickCount: number;
}

/**
 * 관리자 /admin/support 목록용. admin-job.service.ts(listAdminJobsWithStats)와 동일한 철학으로
 * Activity Event를 entityId(supportProgramId) 기준으로 집계해 조회수/찜수/신청클릭수를 계산한다.
 * (찜은 비회원 localStorage가 기본이라 DB 전수 조회가 불가능하므로, job과 동일하게
 * support_bookmarked/support_unbookmarked 이벤트 카운트로 근사한다.)
 */
export async function listAdminSupportProgramsWithStats(): Promise<AdminSupportRow[]> {
  const [programs, events] = await Promise.all([
    getSupportProgramRepository().findAll({ activeOnly: false }),
    activityEventLogger.getRecentEvents(3000),
  ]);

  const supportEvents = events.filter((e) => e.entityType === "support_program" && e.entityId);
  const viewCounts = new Map<string, number>();
  const bookmarkCounts = new Map<string, number>();
  const applyCounts = new Map<string, number>();

  for (const e of supportEvents) {
    const id = e.entityId!;
    if (e.eventType === "support_viewed") viewCounts.set(id, (viewCounts.get(id) ?? 0) + 1);
    if (e.eventType === "support_bookmarked") bookmarkCounts.set(id, (bookmarkCounts.get(id) ?? 0) + 1);
    if (e.eventType === "support_unbookmarked") bookmarkCounts.set(id, Math.max(0, (bookmarkCounts.get(id) ?? 0) - 1));
    if (e.eventType === "support_apply_clicked") applyCounts.set(id, (applyCounts.get(id) ?? 0) + 1);
  }

  return programs
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((program) => ({
      ...program,
      viewCount: viewCounts.get(program.id) ?? 0,
      bookmarkCount: bookmarkCounts.get(program.id) ?? 0,
      applyClickCount: applyCounts.get(program.id) ?? 0,
    }));
}

export interface SupportSyncOverview {
  providerName: string;
  isMock: boolean;
  latestRun: SupportSyncRun | null;
  recentRuns: SupportSyncRun[];
}

/** /admin/support 상단 Provider Sync Analytics 영역용. */
export async function getSupportSyncOverview(): Promise<SupportSyncOverview> {
  const providerName = getSupportProvider().getProviderName();
  const isMock = isUsingMockSupportProvider();
  const recentRuns = await getSupportSyncRunRepository().findAll(10);
  return { providerName, isMock, latestRun: recentRuns[0] ?? null, recentRuns };
}
