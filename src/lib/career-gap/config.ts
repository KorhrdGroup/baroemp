/**
 * Career Gap Engine 설정값 (스펙 11/12/17/45번).
 * 코드 곳곳에 매직넘버를 흩어놓지 않고 이 파일만 조정하면 정책을 바꿀 수 있게 한다.
 */

/** 시장 통계 표본 신뢰도 경계값 (스펙 11번). <10건 LOW, 10~29건 MEDIUM, 30건+ HIGH */
export const MARKET_CONFIDENCE_THRESHOLDS = { mediumMin: 10, highMin: 30 } as const;

/** 시장 통계 분석 기본 기간 (스펙 12번) */
export const DEFAULT_MARKET_PERIOD_DAYS = 90;

/** Job Match Score가 이 값 이상이면 "지원 가능한 공고"로 집계한다 (evaluateJobFit과 동일한 B등급 경계). */
export const ELIGIBLE_JOB_MATCH_THRESHOLD = 60;

/** 이 시간 내 재계산된 Snapshot이 있으면 재사용한다 (관리자 수동 Recalculate 전까지 캐시). */
export const MARKET_SNAPSHOT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** 결과 화면에 "참고용/데이터 부족"을 안내할 최소 표본 기준 (스펙 48번) */
export const MIN_SAMPLE_SIZE_FOR_CONFIDENT_DISPLAY = 10;

/** Counterfactual 복수조건 Simulation은 TOP N Gap까지만 계산한다 (스펙 18번 조합폭발 방지) */
export const MULTI_CONDITION_SIMULATION_TOP_N = 3;

export function computeMarketConfidence(sampleSize: number): "LOW" | "MEDIUM" | "HIGH" {
  if (sampleSize >= MARKET_CONFIDENCE_THRESHOLDS.highMin) return "HIGH";
  if (sampleSize >= MARKET_CONFIDENCE_THRESHOLDS.mediumMin) return "MEDIUM";
  return "LOW";
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
