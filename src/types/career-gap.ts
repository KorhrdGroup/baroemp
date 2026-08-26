import type { ISODateString } from "./common";
import type { MarketConfidenceLevel } from "./market-requirement";
import type { RequirementCategory } from "./career-requirement";

/**
 * 사용자 Requirement 충족 상태 (스펙 13번).
 * ABILITY_EXISTS_BUT_NOT_EXPRESSED는 Resume Gap 전용 세부 상태로, user_status 자체는 아니지만
 * CareerGapItemView.resumeGapNote로 함께 노출한다 (스펙 23번).
 */
export type UserRequirementStatus = "SATISFIED" | "NOT_SATISFIED" | "UNKNOWN" | "CHECK_REQUIRED";

export interface CareerGapAnalysis {
  id: string;
  userId: string;
  occupationId?: string;
  employmentDestinationId?: string;
  targetJobId?: string;
  marketSampleSize: number;
  confidence: MarketConfidenceLevel;
  /** 0~100. 취업 확률이 아닌 내부 Matching Score (스펙 15번) */
  readinessScore: number;
  currentEligibleJobCount: number;
  analysisVersion: number;
  createdAt: ISODateString;
}

export type CareerGapAnalysisInput = Omit<CareerGapAnalysis, "id" | "createdAt" | "analysisVersion"> & {
  analysisVersion?: number;
};

export interface CareerGapItem {
  id: string;
  analysisId: string;
  requirementId: string;
  marketRequiredRate: number;
  marketPreferredRate: number;
  marketMentionRate: number;
  userStatus: UserRequirementStatus;
  importanceScore: number;
  gapScore: number;
  priorityScore: number;
  /** Counterfactual Simulation 결과 - 이 조건 충족 시 예상 지원가능 공고 수 (스펙 17번) */
  projectedEligibleJobCount?: number;
  reason?: string;
  orderIndex: number;
  createdAt: ISODateString;
}

export type CareerGapItemInput = Omit<CareerGapItem, "id" | "createdAt">;

export interface UserEmploymentDestinationInterest {
  id: string;
  userId: string;
  occupationId?: string;
  employmentDestinationId?: string;
  createdAt: ISODateString;
}
export type UserEmploymentDestinationInterestInput = Omit<UserEmploymentDestinationInterest, "id" | "createdAt">;

/** Resume Gap 세부 상태 (스펙 23번). "능력은 있지만 이력서에 드러나지 않음" */
export interface ResumeGapNote {
  requirementId: string;
  requirementName: string;
  kind: "ABILITY_EXISTS_BUT_NOT_EXPRESSED" | "NOT_APPLICABLE";
  message: string;
}

/** Cover Letter Gap 세부 상태 (스펙 25번) */
export interface CoverLetterGapNote {
  requirementId: string;
  requirementName: string;
  message: string;
}

export type ContentRecommendationKind = "QUALIFICATION" | "TRAINING" | "SKILL" | "RESUME" | "COVER_LETTER";

/** 결과 Section 3 "추가 준비 추천" 항목. 시장 데이터와 실제로 연결될 때만 노출한다 (스펙 60번 최종원칙). */
export interface CareerGapRecommendation {
  requirementId: string;
  requirementName: string;
  kind: ContentRecommendationKind;
  title: string;
  description: string;
  contentId?: string;
  marketRate: number;
  projectedEligibleJobCount?: number;
}

/** 결과 화면에서 쓰는 Requirement 하나에 대한 전체 뷰 모델 (Section 1/2/5 공통) */
export interface CareerGapItemView extends CareerGapItem {
  requirementKey: string;
  requirementName: string;
  requirementCategory: RequirementCategory;
  preparationDifficulty: "LOW" | "MEDIUM" | "HIGH";
  /** "관련 공고 243건 중 153건에서 필수 또는 우대조건으로 확인됐습니다" (스펙 19번) */
  relatedJobSampleSize: number;
  relatedJobMatchCount: number;
  resumeGapNote?: ResumeGapNote;
}

/** 복수 조건 Simulation (스펙 18번). TOP 3 Gap 이내로만 계산해 조합폭발을 방지한다. */
export interface MultiConditionSimulationResult {
  requirementIds: string[];
  label: string;
  eligibleJobCount: number;
  deltaFromBaseline: number;
}

export interface EligibleJobSummary {
  jobId: string;
  title: string;
  companyName: string;
  matchScore: number;
}

/** /career-gap 결과 화면 전체를 구성하는 최종 결과 뷰 모델. */
export interface CareerGapResultView {
  analysisId: string;
  occupationId?: string;
  occupationName?: string;
  destinationId?: string;
  destinationName?: string;
  targetJobId?: string;
  targetJobTitle?: string;
  readinessScore: number;
  marketSampleSize: number;
  confidence: MarketConfidenceLevel;
  isDataSufficient: boolean;
  isMockData: boolean;
  currentEligibleJobCount: number;
  wellPreparedItems: CareerGapItemView[];
  improvementItems: CareerGapItemView[];
  topPriorityItem?: CareerGapItemView;
  recommendations: CareerGapRecommendation[];
  eligibleJobs: EligibleJobSummary[];
  multiConditionSimulations: MultiConditionSimulationResult[];
  resumeGapNotes: ResumeGapNote[];
  coverLetterGapNotes: CoverLetterGapNote[];
  createdAt: ISODateString;
}

/** 마이페이지 카드 / 관리자 회원상세 "Career Gap" 섹션에서 공통으로 쓰는 요약 (스펙 37/38번) */
export interface CareerGapSummary {
  id: string;
  occupationName?: string;
  destinationName?: string;
  readinessScore: number;
  topGapName?: string;
  currentEligibleJobCount: number;
  createdAt: ISODateString;
}

/** 관리자 시장분석에서 쓰는 취업처/직업 선택 옵션 (스펙 40번) */
export interface CareerGapTargetOption {
  occupationId: string;
  occupationName: string;
  destinationId?: string;
  destinationName?: string;
}

/** 첨삭 결과 화면 시장 비교 카드 상태. NEEDS_TARGET은 희망직무 미설정 CTA, UNAVAILABLE은 카드 미표시. */
export type ResumeMarketComparisonState = "READY" | "NEEDS_TARGET" | "UNAVAILABLE";

/** 시장 비교 카드의 requirement 1건 (전부 결정론 엔진 산출값 - 스펙 49번). */
export interface ResumeMarketComparisonItem {
  requirementId: string;
  requirementName: string;
  /** 요구+우대 공고 비율(%). market_required_rate + market_preferred_rate, 100 상한. */
  marketRate: number;
  /** 표본 부족(confidence LOW 또는 isDataSufficient=false) 시 false — %수치 대신 정성 문구 표시 */
  showRate: boolean;
  currentEligibleJobCount: number;
  /** Counterfactual: 이 조건 충족 가정 시 매칭 공고 수 (스펙 17번) */
  projectedEligibleJobCount?: number;
  recommendedContent?: { contentId: string; title: string };
}

/** 첨삭 결과 화면(이력서/자소서 공용) 시장 비교 카드 뷰모델. */
export interface ResumeMarketComparisonView {
  state: ResumeMarketComparisonState;
  analysisId?: string;
  occupationName?: string;
  marketSampleSize?: number;
  items: ResumeMarketComparisonItem[];
}
