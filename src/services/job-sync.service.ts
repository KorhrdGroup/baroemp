import { getJobProvider, isUsingMockJobProvider } from "@/features/jobs/providers";
import { normalizedJobToJobInput } from "@/features/jobs/providers/to-job-input";
import { getJobRepository, getJobSyncRunRepository } from "@/lib/repositories";
import type { JobSyncRunStatus, JobSyncSummary } from "@/types";

export interface SyncJobsOptions {
  /** 이번 실행에서 순회를 시작할 페이지 (청크 체인용, 기본 1). */
  startPage?: number;
  /** 1회 Sync에서 순회할 최대 페이지 수 (전국 공고를 한 번에 무리하게 수집하지 않기 위한 안전장치). */
  maxPages?: number;
  /** Work24 display 파라미터 (최대 100). */
  pageSize?: number;
  /**
   * deactivateStale 기준 시각. 여러 청크로 나눠 도는 전량 사이클에서는 사이클 시작 시각을
   * 모든 청크에 전달해, 마지막 청크(reachedEnd)에서만 "사이클 전체에서 안 보인" 공고를 비활성화한다.
   */
  staleBefore?: string;
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
  const startPage = Math.max(1, options.startPage ?? 1);
  const maxPages = options.maxPages ?? Number(process.env.JOB_SYNC_MAX_PAGES ?? 20);
  const lastPage = startPage + maxPages - 1;
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? Number(process.env.WORK24_DISPLAY_SIZE ?? 50)));

  let fetchedCount = 0;
  let newCount = 0;
  let updatedCount = 0;
  const duplicateCount = 0;
  let errorCount = 0;
  const fetchStartedAt = new Date().toISOString();

  // Provider의 공고 목록 끝까지 도달했는지 여부. 페이지 제한(maxPages)에 걸려 일부만
  // 가져온 부분 동기화에서는 false로 남는다.
  let reachedEnd = false;

  // 전량(6만+건) 동기화를 서버리스 크론의 실행시간 한도 안에 끝내기 위해
  // 페이지 fetch는 소규모 병렬, 저장은 페이지 단위 배치 upsert로 처리한다.
  const fetchConcurrency = Math.max(1, Number(process.env.JOB_SYNC_FETCH_CONCURRENCY ?? 5));

  try {
    outer: for (let windowStart = startPage; windowStart <= lastPage; windowStart += fetchConcurrency) {
      const pages: number[] = [];
      for (let p = windowStart; p <= Math.min(lastPage, windowStart + fetchConcurrency - 1); p++) pages.push(p);
      const results = await Promise.all(pages.map((p) => provider.searchJobs({ page: p, pageSize })));

      const windowInputs = results.map((result) => {
        const inputs = [];
        for (const normalized of result.jobs) {
          try {
            inputs.push(normalizedJobToJobInput(normalized));
          } catch (err) {
            if (process.env.NODE_ENV !== "production") {
              console.error("[JobSyncService] 매핑 실패:", err instanceof Error ? err.message : err);
            }
            errorCount++;
          }
        }
        return inputs;
      });

      const batches = await Promise.all(windowInputs.map((inputs) => jobRepo.upsertExternalMany(inputs)));
      for (let i = 0; i < results.length; i++) {
        fetchedCount += results[i].jobs.length;
        newCount += batches[i].newCount;
        updatedCount += batches[i].updatedCount;
        errorCount += batches[i].errorCount;
      }

      if (results.some((r) => r.jobs.length === 0 || !r.hasMore)) {
        reachedEnd = true;
        break outer;
      }
    }

    // 전량을 다 훑은 실행에서만 미수집 공고를 비활성화한다.
    // 부분 동기화(페이지 제한)에서 이걸 실행하면 "이번에 안 가져온" 정상 공고가 전부 꺼진다.
    const deactivatedCount = reachedEnd
      ? await jobRepo.deactivateStale(providerName, options.staleBefore ?? fetchStartedAt)
      : 0;
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
      reachedEnd,
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
      reachedEnd,
      startedAt,
      completedAt,
      errorMessage,
    };
  }
}
