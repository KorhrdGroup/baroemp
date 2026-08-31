import { mockJobRoles } from "@/mocks/job-roles.mock";
import type { AgeGroup, CareerRequirement, DesiredStartTiming, EmploymentStatus, Region, WorkType } from "@/types";
import type { Lead } from "@/types";
import { guessRegionFromSigungu } from "@/lib/regions/sigungu";

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  "10s": "10대",
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

/**
 * 희망직무 분류 코드("care_worker")를 사람이 읽는 이름("요양보호사")으로.
 * 이름을 모르는 코드는 코드를 그대로 돌려주지 않고 비워 둔다 - 이력서나 화면에
 * 코드가 찍히면 고장으로 보인다. 부르는 쪽에서 빈 값을 처리한다.
 */
export function labelJobCategory(code: string): string | undefined {
  return mockJobRoles.find((role) => role.jobCategory === code)?.name;
}

/** 광주광역시 자치구. 아래에서 광주와 전남을 가르는 데 쓴다. */
const GWANGJU_DISTRICTS = ["동구", "서구", "남구", "북구", "광산구"];

const MERGED_JEONNAM_GWANGJU = "전남광주통합특별시";

/**
 * 원본 데이터가 광주광역시와 전라남도를 "전남광주통합특별시" 한 이름으로 묶어 보낸다.
 * 뒤에 붙는 자치단체 이름으로 어느 쪽인지 가른다. 묶인 이름이 아니면 undefined.
 *
 *   "전남광주통합특별시"        -> gwangju (광역 자체)
 *   "전남광주통합특별시 서구"    -> gwangju (광주 자치구 5곳)
 *   "전남광주통합특별시교육청"   -> gwangju (띄지 않고 붙은 것은 광역 단위 기관)
 *   "전남광주통합특별시 영암군"  -> jeonnam (그 외는 전남 시·군)
 */
export function resolveMergedJeonnamGwangju(name: string): "gwangju" | "jeonnam" | undefined {
  if (!name.startsWith(MERGED_JEONNAM_GWANGJU)) return undefined;
  const rest = name.slice(MERGED_JEONNAM_GWANGJU.length).trim();
  if (!rest) return "gwangju";
  if (GWANGJU_DISTRICTS.includes(rest)) return "gwangju";
  if (!rest.includes(" ") && !rest.endsWith("시") && !rest.endsWith("군")) return "gwangju";
  return "jeonnam";
}

/**
 * 지원제도 운영기관 이름 표기.
 *
 * 아직 출범하지 않은 "전남광주통합특별시" 를 회원이 보면 어디인지 알 수 없다.
 * 화면에서만 바꿔 적고 데이터는 손대지 않는다. 원본이 정리되면 이 함수만 지우면 된다.
 */
export function labelOrganization(name: string): string {
  const side = resolveMergedJeonnamGwangju(name);
  if (!side) return name;

  const raw = name.slice(MERGED_JEONNAM_GWANGJU.length);
  const rest = raw.trim();
  if (!rest) return "광주광역시";
  if (side === "jeonnam") return `전라남도 ${rest}`;
  // 띄어 쓴 것(자치구)은 띄어서, 붙여 쓴 것(교육청·도시공사)은 붙여서 적는다.
  return raw.startsWith(" ") ? `광주광역시 ${rest}` : `광주광역시${rest}`;
}

const REGION_KEYWORD_MAP: Array<{ region: Region; keywords: string[] }> = [
  { region: "seoul", keywords: ["서울"] },
  { region: "gyeonggi", keywords: ["경기"] },
  { region: "incheon", keywords: ["인천"] },
  { region: "gangwon", keywords: ["강원"] },
  { region: "chungbuk", keywords: ["충북", "충청북"] },
  { region: "chungnam", keywords: ["충남", "충청남"] },
  { region: "daejeon", keywords: ["대전"] },
  { region: "sejong", keywords: ["세종"] },
  { region: "jeonbuk", keywords: ["전북", "전라북"] },
  { region: "jeonnam", keywords: ["전남", "전라남"] },
  { region: "gwangju", keywords: ["광주"] },
  { region: "gyeongbuk", keywords: ["경북", "경상북"] },
  { region: "gyeongnam", keywords: ["경남", "경상남"] },
  { region: "daegu", keywords: ["대구"] },
  { region: "ulsan", keywords: ["울산"] },
  { region: "busan", keywords: ["부산"] },
  { region: "jeju", keywords: ["제주"] },
];

/**
 * 자유 텍스트 지역명(예: "서울 강북구", "서울특별시 광진구")을 내부 Region 코드로 매핑한다.
 * 매칭 실패 시 undefined (draft 취급, 관리자가 보정 가능).
 *
 * 외부 Provider 가 지역을 정할 때도, 화면이 "이 기관명이 이미 그 지역인가"를 물을 때도
 * 같은 함수를 쓴다. 판단이 갈리면 기관명과 지역이 서로 다른 말을 하게 된다.
 */
export function guessRegionFromText(text?: string): Region | undefined {
  if (!text) return undefined;
  /*
    "전남광주통합특별시" 는 광주와 전남을 한 이름으로 묶어 보낸다. 키워드를 앞에서부터
    훑으면 "전남" 이 먼저 걸려 광주 것까지 전남으로 간다. 이 이름은 따로 가른다.
  */
  const merged = resolveMergedJeonnamGwangju(text);
  if (merged) return merged;
  /*
    시·군·구 이름을 광역 키워드보다 먼저 본다. 광역 키워드가 기초 이름 안에 숨어 있는
    경우("해운대구" 안의 "대구")에 엉뚱한 광역으로 가고, 광역 이름 없이 기초 이름만
    있는 기관("용산구시설관리공단")은 아예 못 찾기 때문이다.
  */
  const bySigungu = guessRegionFromSigungu(text);
  if (bySigungu) return bySigungu;
  const found = REGION_KEYWORD_MAP.find(({ keywords }) => keywords.some((kw) => text.includes(kw)));
  return found?.region;
}
