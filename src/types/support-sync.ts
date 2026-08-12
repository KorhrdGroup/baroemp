import type { ISODateString } from "./common";
import type { SupportProviderName } from "./support-program";

export type SupportSyncRunStatus = "running" | "success" | "partial" | "failed";

/**
 * Support Sync Run: 관리자 "지원제도 동기화" 실행 이력.
 * /admin/support 상단 Provider Sync Analytics에서 사용한다 (job_sync_runs와 동일한 철학).
 */
export interface SupportSyncRun {
  id: string;
  provider: SupportProviderName;
  startedAt: ISODateString;
  completedAt?: ISODateString;
  status: SupportSyncRunStatus;
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

export type SupportSyncRunInput = Partial<Omit<SupportSyncRun, "id" | "createdAt">> & {
  provider: SupportProviderName;
};

export interface SupportSyncSummary {
  provider: SupportProviderName;
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
  /**
   * STEP 5.5: 이번 Sync에서 "바로취업 관련도" 임계값 이상으로 판정된 건수와,
   * 그중 실제로 serviceDetail/supportConditions 보강 호출을 수행한 건수.
   * DB에는 저장하지 않고(별도 migration 없이) 응답에만 포함한다.
   */
  relevantCount?: number;
  enrichedCount?: number;
}
