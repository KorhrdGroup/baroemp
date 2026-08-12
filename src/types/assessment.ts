import type { CareerProfileInput } from "./career-profile";
import type { ISODateString, Tag } from "./common";
import type { OccupationDimension } from "./occupation";

/**
 * Assessment V2: "직업진단 = Career DB 생성기" 를 지원하기 위한 확장 모델.
 *
 * assessment_questions / assessment_options 를 완전히 데이터 기반으로 다루기 위해
 * 질문은 절대 화면 컴포넌트에 하드코딩하지 않고, 이 구조를 그대로 렌더링한다.
 */
export type AssessmentType = "job_fit" | "employability" | "personality" | "skill" | "other";

/** 검사 섹션 - A~E, 관리자가 자유롭게 추가/이름 변경 가능하도록 코드+라벨 배열로 관리 */
export interface AssessmentSection {
  key: string;
  label: string;
  order: number;
}

export type AssessmentAnswerType =
  | "SINGLE"
  | "MULTI"
  | "SCALE"
  | "NUMBER"
  | "TEXT"
  | "REGION"
  | "SALARY_RANGE"
  | "QUALIFICATION_MULTI";

/**
 * CareerProfile 로 직접 반영 가능한 필드 키.
 * profile-extractor.ts 가 이 값을 보고 CareerProfileInput 의 어떤 필드에 매핑할지 결정한다.
 */
export type ProfileFieldKey = keyof CareerProfileInput | (string & {});

export interface AssessmentOption {
  id: string;
  questionId: string;
  optionText: string;
  /** 저장되는 값 (코드성 문자열) */
  value: string;
  /** 이 옵션 선택 시 각 Dimension에 더해지는 점수 (0~5 스케일 기준) */
  scoreMap?: Partial<Record<OccupationDimension, number>>;
  /** profileField에 반영될 값 (문자열/불린 등 자유) */
  profileValue?: unknown;
  tags?: Tag[];
  sortOrder: number;
}

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  section: string;
  questionText: string;
  description?: string;
  answerType: AssessmentAnswerType;
  orderIndex: number;
  required: boolean;
  /** CareerProfile 반영 대상 필드 (있으면 profile-extractor가 사용) */
  profileField?: ProfileFieldKey;
  /** Occupation Dimension 채점 대상 (SCALE 문항 등에서 사용) */
  scoringDimension?: OccupationDimension | (string & {});
  options?: AssessmentOption[];
  /** SCALE 문항의 범위 (기본 1~5) */
  minScale?: number;
  maxScale?: number;
  metadata?: Record<string, unknown>;
}

export interface Assessment {
  id: string;
  title: string;
  type: AssessmentType;
  description: string;
  estimatedMinutes: number;
  sections: AssessmentSection[];
  questions: AssessmentQuestion[];
  tags: Tag[];
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type AssessmentInput = Partial<Omit<Assessment, "id" | "createdAt" | "updatedAt">> & {
  title: string;
  type: Assessment["type"];
};

/** 검사 진행 세션 - 비회원도 anonymous_id 로 진행 가능 */
export type AssessmentSessionStatus = "started" | "in_progress" | "completed" | "abandoned";

export interface AssessmentSession {
  id: string;
  assessmentId: string;
  userId?: string;
  anonymousId?: string;
  status: AssessmentSessionStatus;
  currentSection: string;
  currentStep: number;
  totalSteps: number;
  startedAt: ISODateString;
  updatedAt: ISODateString;
  completedAt?: ISODateString;
}

/**
 * 원본 답변 - Career DB의 1차 자료(source of truth).
 * Activity Event는 행동분석용 요약이고, 이 answer 레코드가 실제 정답 데이터다.
 */
export interface AssessmentAnswerRecord {
  id: string;
  sessionId: string;
  questionId: string;
  /** SINGLE 답변 */
  optionId?: string;
  /** MULTI / QUALIFICATION_MULTI 답변 */
  optionIds?: string[];
  /** SCALE(숫자) / NUMBER / TEXT / REGION / SALARY_RANGE 등 자유 값 */
  rawValue?: unknown;
  answeredAt: ISODateString;
}

export type AssessmentAnswerInput = Omit<AssessmentAnswerRecord, "id" | "answeredAt">;

/** 직업별 추천 결과 - 결과 화면/관리자에서 공통으로 사용하는 단위. */
export interface OccupationRecommendation {
  occupationId: string;
  occupationName: string;
  occupationCategory?: string;
  jobCategoryCode?: string;
  /** 0~100 총 추천 점수 */
  totalScore: number;
  /** 세부 서브스코어 (0~100) */
  dimensionFitScore: number;
  conditionFitScore: number;
  entryFeasibilityScore: number;
  experienceUtilizationScore: number;
  /** 0~100 현재 취업 준비도 */
  readinessScore: number;
  grade: "매우 잘 맞아요" | "잘 맞아요" | "도전해볼 만해요" | "준비가 더 필요해요";
  reasons: string[];
  risks: string[];
  missingConditions: string[];
  requiredQualifications: string[];
  recommendedContentIds: string[];
  /** 콘텐츠 이수 시 예상 준비도 변화 (콘텐츠 id -> 예상 준비도) */
  readinessProjection: { contentId: string; contentTitle: string; projectedScore: number }[];
}

export interface AssessmentResult {
  id: string;
  sessionId: string;
  assessmentId: string;
  userId?: string;
  anonymousId?: string;
  /** Dimension별 0~100 정규화 점수 */
  dimensionScores: Record<string, number>;
  /** Career Profile로 반영된(반영을 시도한) 필드 요약 */
  extractedProfile: CareerProfileInput;
  /** 자동 부여된 태그 목록 */
  generatedTags: string[];
  recommendations: OccupationRecommendation[];
  summary: string;
  engineVersion: string;
  completedAt: ISODateString;
}

export type AssessmentResultInput = Omit<AssessmentResult, "id" | "completedAt">;
