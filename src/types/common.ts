/**
 * 서비스 전역에서 재사용되는 공용 타입.
 * 특정 도메인에 종속되지 않는 값은 전부 이곳에 정의한다.
 */

/** 연령대 - 향후 관리자가 구간을 조정할 수 있도록 문자열 코드로 취급한다. */
export type AgeGroup =
  | "10s"
  | "20s"
  | "30s"
  | "40s"
  | "50s"
  | "60s"
  | "70plus";

/** 광역 지역 코드 (시/도 단위). 세부 지역은 추후 별도 코드 테이블로 확장. */
export type Region =
  | "seoul"
  | "gyeonggi"
  | "incheon"
  | "gangwon"
  | "chungbuk"
  | "chungnam"
  | "daejeon"
  | "sejong"
  | "jeonbuk"
  | "jeonnam"
  | "gwangju"
  | "gyeongbuk"
  | "gyeongnam"
  | "daegu"
  | "ulsan"
  | "busan"
  | "jeju";

export type EducationLevel =
  | "below_high_school"
  | "high_school"
  | "college_2y"
  | "university_4y"
  | "graduate";

export type EmploymentStatus =
  | "employed"
  | "unemployed"
  | "career_break"
  | "self_employed"
  | "preparing_retirement"
  /** STEP 5: 은퇴 후 재취업을 준비 중인 상태 (지원금 진단 전용 옵션) */
  | "retired_seeking";

export type WorkType =
  | "full_time"
  | "part_time"
  | "contract"
  | "daily"
  | "freelance";

export type DesiredStartTiming =
  | "immediately"
  | "within_1_month"
  | "within_3_months"
  | "within_6_months"
  | "undecided";

/**
 * 콘텐츠/직업/지원금 등이 공통으로 사용하는 상태 값.
 * 새로운 상태가 필요하면 문자열을 추가하되 기존 값은 유지한다 (하위호환).
 */
export type PublishStatus = "draft" | "published" | "archived";

/** 정렬/페이지네이션 등에 쓰이는 범용 목록 응답 래퍼. 향후 Supabase 응답과 호환되도록 설계. */
export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

/** ISO-8601 문자열 타임스탬프. Supabase(Postgres timestamptz)와 호환. */
export type ISODateString = string;

/**
 * 태그는 직업/콘텐츠/사용자 관심사를 느슨하게 연결하는 핵심 도구다.
 * 자유 문자열이지만, 관리자 UI에서 자동완성을 제공해 일관성을 유지하는 것을 전제로 한다.
 */
export type Tag = string;
