import type { AgeGroup, DesiredStartTiming, EmploymentStatus, ISODateString, Region } from "./common";

/**
 * 지원금 진단(Support Assessment) 답변.
 *
 * Career Assessment Engine(질문 DB 기반)과 달리, 지원금 진단은 스펙에서 정의한
 * 고정된 9개 항목만 다루므로 화면/서버 모두 이 고정 타입을 그대로 사용한다.
 * (질문 수가 적고 자주 바뀌지 않아, 굳이 assessment_questions 같은 동적 스키마를 재사용하지 않는다.)
 *
 * 주의: 주민등록번호/상세 재산정보 등 민감정보는 절대 수집하지 않는다.
 */
export interface SupportAssessmentAnswers {
  ageGroup?: AgeGroup;
  region?: Region;
  employmentStatus?: EmploymentStatus;
  desiredStartTiming?: DesiredStartTiming;
  /** 직업훈련 참여 의향 (1~5 스케일) */
  trainingWillingness?: number;
  /** 현재 종사 직종 코드 (재직 중일 때만 수집) */
  currentJobCategory?: string;
  careerBreak?: boolean;
  careerBreakMonths?: number;
  /** 정부지원 활용 의향 (참고용 - 매칭 점수에는 직접 반영하지 않음) */
  openToGovSupport?: boolean;
  /** 출생연도 (만 나이 기반 정밀 매칭용, ageGroup은 여기서 파생) */
  birthYear?: number;
  /** 최근 3년 내 고용보험 가입 이력 - 실업급여/국민취업지원 유형을 가르는 핵심 변수 */
  employmentInsuranceHistory?: "yes" | "no" | "unknown";
  /** 가구 소득 수준 (참고용 구간, 소득 조건 제도는 "확인 필요"로 안내) */
  incomeBand?: "low" | "middle" | "high" | "unknown";
  /** 가구 특성 (한부모/장애/기초수급 등 우선지원 대상 확인용, 선택) */
  householdTraits?: string[];
}

export type SupportAssessmentSessionStatus = "in_progress" | "completed";

export interface SupportAssessmentSession {
  id: string;
  userId?: string;
  anonymousId?: string;
  status: SupportAssessmentSessionStatus;
  answers: SupportAssessmentAnswers;
  startedAt: ISODateString;
  completedAt?: ISODateString;
  updatedAt: ISODateString;
}

export type SupportAssessmentSessionInput = Partial<
  Omit<SupportAssessmentSession, "id" | "startedAt" | "updatedAt">
>;
