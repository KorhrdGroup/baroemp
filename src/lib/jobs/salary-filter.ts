/**
 * 일자리 찾기 "급여" 필터의 고를 거리. 검색바(job-filters-form)와 /jobs 쿼리 읽기가 같이 쓴다.
 *
 * 공고 급여는 시급 · 일급 · 월급 · 연봉으로 따로 저장돼(jobs.salary_type, 전 건 채워짐) 금액끼리 바로 견줄 수 없다.
 * 받는 방식을 먼저 고르고, 그 방식 안에서 최소 금액을 건다. 금액 칸은 받는 방식마다 다르다.
 * 쿼리: pay=monthly · payMin=2500000(원).
 */
export type SalaryFilterUnit = "monthly" | "hourly" | "daily" | "annual";

export const SALARY_FILTER_UNITS: { key: SalaryFilterUnit; label: string }[] = [
  { key: "monthly", label: "월급" },
  { key: "hourly", label: "시급" },
  { key: "daily", label: "일급" },
  { key: "annual", label: "연봉" },
];

/** 최소 금액 칸. 시급 첫 칸은 올해 최저시급. */
export const SALARY_FILTER_AMOUNTS: Record<SalaryFilterUnit, { value: number; label: string }[]> = {
  monthly: [
    { value: 2_000_000, label: "200만 원" },
    { value: 2_500_000, label: "250만 원" },
    { value: 3_000_000, label: "300만 원" },
    { value: 3_500_000, label: "350만 원" },
    { value: 4_000_000, label: "400만 원" },
  ],
  hourly: [
    { value: 10_320, label: "최저시급(10,320원)" },
    { value: 11_000, label: "1만 1천 원" },
    { value: 12_000, label: "1만 2천 원" },
    { value: 15_000, label: "1만 5천 원" },
  ],
  daily: [
    { value: 80_000, label: "8만 원" },
    { value: 100_000, label: "10만 원" },
    { value: 120_000, label: "12만 원" },
    { value: 150_000, label: "15만 원" },
  ],
  annual: [
    { value: 24_000_000, label: "2,400만 원" },
    { value: 30_000_000, label: "3,000만 원" },
    { value: 36_000_000, label: "3,600만 원" },
    { value: 42_000_000, label: "4,200만 원" },
  ],
};

export function parseSalaryUnit(value: string | undefined): SalaryFilterUnit | undefined {
  return SALARY_FILTER_UNITS.some((u) => u.key === value) ? (value as SalaryFilterUnit) : undefined;
}

/** 쿼리의 금액이 그 받는 방식의 칸 중 하나일 때만 받는다(손으로 고친 주소로 엉뚱한 값이 걸리지 않게). */
export function parseSalaryAtLeast(unit: SalaryFilterUnit | undefined, value: string | undefined): number | undefined {
  if (!unit || !value) return undefined;
  const n = Number(value);
  return SALARY_FILTER_AMOUNTS[unit].some((a) => a.value === n) ? n : undefined;
}

/** "월급 250만 원 이상" · "시급 공고 모두". 칩 · 판 아래 요약에 쓴다. */
export function salaryFilterLabel(unit: SalaryFilterUnit, atLeast?: number): string {
  const unitLabel = SALARY_FILTER_UNITS.find((u) => u.key === unit)!.label;
  const amount = SALARY_FILTER_AMOUNTS[unit].find((a) => a.value === atLeast);
  return amount ? `${unitLabel} ${amount.label} 이상` : `${unitLabel} 공고 모두`;
}

/** 검색바 칸에 쓰는 짧은 말. "월급 250만 이상" · "시급". */
export function salaryFilterShortLabel(unit: SalaryFilterUnit, atLeast?: number): string {
  const unitLabel = SALARY_FILTER_UNITS.find((u) => u.key === unit)!.label;
  const amount = SALARY_FILTER_AMOUNTS[unit].find((a) => a.value === atLeast);
  if (!amount) return unitLabel;
  /* 최저시급은 괄호 속 금액을 빼야 칸에 들어간다. */
  return `${unitLabel} ${amount.label.replace(/\(.*\)/, "").replace(/ 원$/, "")} 이상`;
}
