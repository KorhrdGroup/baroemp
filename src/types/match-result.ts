import type { ISODateString } from "./common";

/**
 * Match Result: Matching Engine의 출력값.
 * 사용자 ↔ 직업 / 콘텐츠 / 채용공고 / 지원금 간의 추천 결과를 표현한다.
 *
 * 방향성을 명시적으로 표현하기 위해 targetType을 둔다.
 * - USER → CONTENT/JOB/SUPPORT_PROGRAM 추천 (사용자 홈/추천 위젯에서 사용)
 * - CONTENT → USERS 추천 (신규 콘텐츠 등록 시 잠재고객 추출, 관리자 리드 페이지에서 사용)
 */
export type MatchTargetType = "job" | "content" | "support_program" | "user" | "occupation";

export interface MatchReasonDetail {
  ruleKey: string;
  label: string;
  score: number;
}

export interface MatchResult {
  id: string;
  /** 매칭의 기준이 되는 주체 (userId 또는 contentId 등) */
  sourceType: MatchTargetType;
  sourceId: string;
  /** sourceType이 "user"이고 회원일 때만 채운다 (DB user_id FK 매핑용). */
  userId?: string;
  /** sourceType이 "user"이고 비회원일 때만 채운다. */
  anonymousId?: string;

  targetType: MatchTargetType;
  targetId: string;

  /** 0~100 정규화 점수 */
  score: number;
  /**
   * "A"~"D"는 콘텐츠/채용 매칭 등급, "HIGH"~"LOW"는 지원제도 가능성 등급(SupportEligibilityGrade)이다.
   * DB 컬럼(match_results.grade)은 text라 두 체계를 함께 저장할 수 있다.
   */
  grade?: "A" | "B" | "C" | "D" | "HIGH" | "MEDIUM" | "CHECK_REQUIRED" | "LOW";
  reasons: MatchReasonDetail[];
  /**
   * 지원제도 매칭처럼 "충족/확인필요/부족" 조건 목록을 함께 보관해야 하는 경우에 사용하는
   * 범용 상세 정보. reasons(점수 반영 사유)와 달리 점수에 반영되지 않는 안내용 정보도 담을 수 있다.
   */
  detail?: {
    matchedConditions?: string[];
    missingConditions?: string[];
    checkRequiredConditions?: string[];
  };
  /** 추천을 생성한 엔진의 버전 (예: CAREER_ASSESSMENT_V1). 엔진 개선 시 이전 결과와 비교하기 위해 기록한다. */
  engineVersion?: string;

  computedAt: ISODateString;
}
