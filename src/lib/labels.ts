import type { AgeGroup, CareerRequirement, DesiredStartTiming, EmploymentStatus, Region, WorkType } from "@/types";
import type { Lead } from "@/types";

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  "20s": "20대",
  "30s": "30대",
  "40s": "40대",
  "50s": "50대",
  "60s": "60대",
  "70plus": "70대+",
};

export const REGION_LABELS: Record<Region, string> = {
  seoul: "서울",
  gyeonggi: "경기",
  incheon: "인천",
  gangwon: "강원",
  chungbuk: "충북",
  chungnam: "충남",
  daejeon: "대전",
  sejong: "세종",
  jeonbuk: "전북",
  jeonnam: "전남",
  gwangju: "광주",
  gyeongbuk: "경북",
  gyeongnam: "경남",
  daegu: "대구",
  ulsan: "울산",
  busan: "부산",
  jeju: "제주",
};

export const DESIRED_START_TIMING_LABELS: Record<DesiredStartTiming, string> = {
  immediately: "즉시",
  within_1_month: "1개월 이내",
  within_3_months: "3개월 이내",
  within_6_months: "6개월 이내",
  undecided: "미정",
};

/** STEP 5: 지원금 진단/Career Profile에서 공통으로 쓰는 취업상태 라벨. */
export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  employed: "재직 중",
  unemployed: "구직 중",
  career_break: "경력단절",
  self_employed: "자영업",
  preparing_retirement: "퇴직 예정",
  retired_seeking: "은퇴 후 재취업 준비",
};

export function labelEmploymentStatus(value?: EmploymentStatus): string {
  return value ? (EMPLOYMENT_STATUS_LABELS[value] ?? value) : "-";
}

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  full_time: "정규직",
  part_time: "파트타임",
  contract: "계약직",
  daily: "일용직",
  freelance: "프리랜서",
};

export const CAREER_REQUIREMENT_LABELS: Record<string, string> = {
  new: "신입가능",
  experienced: "경력직",
  any: "경력무관",
};

/** Work24 pfPreferential 코드 라벨. base-provider.ts의 PREFERENTIAL_CODE_LABELS와 동일한 값을 참조한다. */
export const PREFERENTIAL_CODE_LABELS: Record<string, string> = {
  "14": "운전가능자 우대",
  B: "(준)고령자 우대",
};

/** Job.preferredQualifications / Content.recommendationRules에서 공유하는 자격 코드 라벨. */
export const QUALIFICATION_LABELS: Record<string, string> = {
  "cert-care-worker": "요양보호사",
  "cert-social-worker-2": "사회복지사 2급",
  "cert-driver-1": "1종 보통 운전면허",
  "cert-childcare-2": "보육교사 2급",
  "cert-lifelong-edu-2": "평생교육사 2급",
  "cert-youth-worker-2": "청소년지도사 2급",
  "cert-counselor": "심리상담사",
  "cert-career-counselor-2": "직업상담사 2급",
  "cert-computer": "컴퓨터활용능력",
  "cert-security-manager": "경비지도사",
  "cert-cook": "조리사 (한식 등)",
  "cert-beautician": "미용사 면허",
  "cert-forklift": "지게차운전기능사",
  "cert-hospital-companion": "병원동행매니저",
  "cert-afterschool-care": "방과후돌봄교실지도사",
  "cert-silver-cognitive": "실버인지활동지도사",
  "cert-other": "기타 자격 있음",
};

export function labelQualification(code: string): string {
  if (QUALIFICATION_LABELS[code]) return QUALIFICATION_LABELS[code];
  return code.replace(/^cert-/, "").replace(/-/g, " ");
}

export const LEAD_STATUS_LABELS: Record<Lead["status"], string> = {
  new: "신규",
  contacting: "컨택중",
  consulting: "상담중",
  converted: "전환",
  closed: "종료",
};

export function labelAgeGroup(value?: AgeGroup): string {
  return value ? AGE_GROUP_LABELS[value] : "-";
}

export function labelRegion(value?: Region): string {
  return value ? REGION_LABELS[value] : "-";
}

export function labelDesiredStartTiming(value?: DesiredStartTiming): string {
  return value ? DESIRED_START_TIMING_LABELS[value] : "-";
}

export function labelLeadStatus(value: Lead["status"]): string {
  return LEAD_STATUS_LABELS[value];
}

export function labelWorkType(value?: WorkType): string {
  return value ? (WORK_TYPE_LABELS[value] ?? value) : "-";
}

export function labelCareerRequirement(value?: CareerRequirement): string {
  if (!value) return "-";
  return CAREER_REQUIREMENT_LABELS[value] ?? value;
}

export function labelPreferentialCode(code: string): string {
  return PREFERENTIAL_CODE_LABELS[code] ?? code;
}
