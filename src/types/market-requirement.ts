import type { ISODateString } from "./common";

/** 표본 신뢰도 등급 (스펙 11번). 경계값은 config로 분리한다. */
export type MarketConfidenceLevel = "LOW" | "MEDIUM" | "HIGH";

/** 특정 Requirement 하나에 대한 시장 통계 (스펙 10번). */
export interface MarketRequirementStat {
  requirementId: string;
  requiredCount: number;
  preferredCount: number;
  mentionCount: number;
  requiredRate: number;
  preferredRate: number;
  mentionRate: number;
}

/**
 * 직업/취업처 단위 시장 요구조건 통계 조회 결과.
 * DB 계산 여부와 무관하게 서비스 레이어가 항상 이 모양으로 반환해, snapshot 유무에 UI가 의존하지 않게 한다.
 */
export interface MarketRequirementSnapshot {
  id?: string;
  occupationId?: string;
  destinationId?: string;
  periodDays: number;
  periodStart: string;
  periodEnd: string;
  sampleSize: number;
  confidence: MarketConfidenceLevel;
  requirements: MarketRequirementStat[];
  /** MockJobProvider 기반 데이터로 계산된 경우 true (스펙 45번 - 개발환경에 명확히 표시) */
  isMockData: boolean;
  calculatedAt: ISODateString;
}

export type MarketRequirementSnapshotInput = Omit<MarketRequirementSnapshot, "id" | "calculatedAt"> & {
  calculatedAt?: ISODateString;
};

export type MarketRequirementSnapshotFilter = { occupationId?: string; destinationId?: string };
