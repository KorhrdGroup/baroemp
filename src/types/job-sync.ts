import type { ISODateString } from "./common";
import type { JobProviderName } from "./job";

export type JobSyncRunStatus = "running" | "success" | "partial" | "failed";

/**
 * Job Sync Run: 관리자 "채용공고 동기화" 실행 이력.
 * /admin/jobs 상단 Provider Sync Analytics에서 사용한다.
 */
export interface JobSyncRun {
  id: string;
  provider: JobProviderName;
  startedAt: ISODateString;
  completedAt?: ISODateString;
  status: JobSyncRunStatus;
  fetchedCount: number;
  newCount: number;
  updatedCount: number;
  duplicateCount: number;
  deactivatedCount: number;
  errorCount: number;
  errorMessage?: string;
  triggeredBy?: string;
  createdAt: ISODateString;
}

export type JobSyncRunInput = Partial<Omit<JobSyncRun, "id" | "createdAt">> & {
  provider: JobProviderName;
};

/** syncJobsFromProvider()의 반환값. 관리자 UI에 그대로 표시한다. */
export interface JobSyncSummary {
  provider: JobProviderName;
  fetchedCount: number;
  newCount: number;
  updatedCount: number;
  duplicateCount: number;
  deactivatedCount: number;
  errorCount: number;
  isMock: boolean;
  startedAt: ISODateString;
  completedAt: ISODateString;
  errorMessage?: string;
}
