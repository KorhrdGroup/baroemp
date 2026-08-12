import type { AgeGroup, DesiredStartTiming, ISODateString, Region } from "./common";

/** CRM 영업팀이 우선순위를 판단하는 기준이 되는 등급. */
export type LeadGrade = "A" | "B" | "C" | "D";

/**
 * Lead Score 계산에 사용되는 개별 신호(signal).
 * scoring-rules.ts에서 이 신호들에 대한 점수를 정의하며,
 * 관리자 설정값으로 교체하기 쉽도록 key 기반으로 설계한다.
 */
export interface LeadSignal {
  key: string;
  label: string;
  /** 해당 신호가 이 리드에 대해 활성화되었는지 여부 */
  active: boolean;
  /** 활성화 시 부여되는 점수 (scoring-rules에서 가져온 값) */
  points: number;
}

export interface LeadScoreBreakdown {
  totalScore: number;
  grade: LeadGrade;
  signals: LeadSignal[];
}

/**
 * Lead: 관리자 리드관리/대시보드에서 다루는 잠재고객 단위.
 * CareerProfile + 최근 활동을 요약한 CRM 관점의 뷰 모델이다.
 */
export interface Lead {
  id: string;
  userId: string;
  name: string;
  ageGroup?: AgeGroup;
  region?: Region;
  interestedJobLabel?: string;
  desiredStartTiming?: DesiredStartTiming;
  recentActionLabel: string;
  recommendedContentTitle?: string;
  status: "new" | "contacting" | "consulting" | "converted" | "closed";
  score: LeadScoreBreakdown;
  lastActivityAt: ISODateString;
  createdAt: ISODateString;
}
