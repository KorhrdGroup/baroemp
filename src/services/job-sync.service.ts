import { getJobProvider, isUsingMockJobProvider } from "@/features/jobs/providers";
import { normalizedJobToJobInput } from "@/features/jobs/providers/to-job-input";
import { getJobRepository, getJobSyncRunRepository } from "@/lib/repositories";
import type { JobSyncRunStatus, JobSyncSummary } from "@/types";

export interface SyncJobsOptions {
  /** 1회 Sync에서 순회할 최대 페이지 수 (전국 공고를 한 번에 무리하게 수집하지 않기 위한 안전장치). */
  maxPages?: number;
  /** Work24 display 파라미터 (최대 100). */
  pageSize?: number;
  triggeredBy?: string;
}

/**
 * Job Sync Service: 외부 Provider -> Normalize -> jobs DB Upsert.
 *
 * 1. Provider 호출 (batch pagination, API 제한을 고려해 maxPages까지만 순회)
 * 2. NormalizedJob -> JobInput 변환
 * 3. (externalSource, externalId) 기준 upsert (신규/수정 집계)
 * 4. 이번 Sync에서 다시 보이지 않은 기존 공고는 삭제 대신 비활성화(deactivateStale)
 * 5. job_sync_runs에 실행 이력 기록 (관리자 Provider Sync Analytics)
 *
 * WORK24_API_KEY가 없어 MockJobProvider가 활성화된 경우에도 동일한 흐름으로 동작한다
 * (반환값의 isMock=true로 관리자 화면에 명확히 표시한다).
 */
export async function syncJobsFromProvider(options: SyncJobsOptions = {}): Promise<JobSyncSummary> {
  const provider = getJobProvider();
  const providerName = provider.getProviderName();
  const isMock = isUsingMockJobProvider();
  const startedAt = new Date().toISOString();

  const syncRunRepo = getJobSyncRunRepository();
  const run = await syncRunRepo.create({
    provider: providerName,
    startedAt,
    status: "running",
    triggeredBy: options.triggeredBy,
  });

  const jobRepo = getJobRepository();
  const maxPages = options.maxPages ?? Number(process.env.JOB_SYNC_MAX_PAGES ?? 20);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? Number(process.env.WORK24_DISPLAY_SIZE ?? 50)));

  let fetchedCount = 0;
  let newCount = 0;
  let updatedCount = 0;
  const duplicateCount = 0;
  let errorCount = 0;
  const fetchStartedAt = new Date().toISOString();

  try {
    for (let page = 1; page <= maxPages; page++) {
      const result = await provider.searchJobs({ page, pageSize });
      if (result.jobs.length === 0) break;
      fetchedCount += result.jobs.length;

      for (const normalized of result.jobs) {
        try {
          const jobInput = normalizedJobToJobInput(normalized);
          const { isNew } = await jobRepo.upsertExternal(jobInput);
          if (isNew) newCount++;
          else updatedCount++;
        } catch (err) {
          // 개별 공고 매핑/저장 실패는 전체 Sync를 중단시키지 않고 계속 진행한다.
          if (process.env.NODE_ENV !== "production") {
            console.error("[JobSyncService] upsertExternal 실패:", err instanceof Error ? err.message : err);
          }
          errorCount++;
        }
      }

      if (!result.hasMore) break;
    }

    const deactivatedCount = await jobRepo.deactivateStale(providerName, fetchStartedAt);
    const completedAt = new Date().toISOString();
    const status: JobSyncRunStatus = errorCount > 0 ? "partial" : "success";

    await syncRunRepo.update(run.id, {
      completedAt,
      status,
      fetchedCount,
      newCount,
      updatedCount,
      duplicateCount,
      deactivatedCount,
      errorCount,
    });

    return {
      provider: providerName,
      fetchedCount,
      newCount,
      updatedCount,
      duplicateCount,
      deactivatedCount,
      errorCount,
      isMock,
      startedAt,
      completedAt,
    };
  } catch (err) {
    const completedAt = new Date().toISOString();
    const errorMessage = err instanceof Error ? err.message : String(err);
    await syncRunRepo.update(run.id, {
      completedAt,
      status: "failed",
      fetchedCount,
      newCount,
      updatedCount,
      duplicateCount,
      deactivatedCount: 0,
      errorCount: errorCount + 1,
      errorMessage,
    });

    return {
      provider: providerName,
      fetchedCount,
      newCount,
      updatedCount,
      duplicateCount,
      deactivatedCount: 0,
      errorCount: errorCount + 1,
      isMock,
      startedAt,
      completedAt,
      errorMessage,
    };
  }
}
