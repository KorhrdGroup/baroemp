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
  /** 보유 자격 코드 배열 (Job.preferredQualifications와 동일한 코드 체계) */
  heldQualifications?: string[];
  /** 희망직종 코드 배열 (jobCategory) */
  desiredJobCategories?: string[];
  careerBreak?: boolean;
  careerBreakMonths?: number;
  /** 정부지원 활용 의향 (참고용 - 매칭 점수에는 직접 반영하지 않음) */
  openToGovSupport?: boolean;
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
