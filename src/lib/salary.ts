import type { Job, SalaryType } from "@/types";

/**
 * 급여 종류. jobs.salary_type 은 전 건에 채워져 있고 네 값만 쓴다.
 * 원문(salary_text)에는 종류가 안 들어 있어서, 붙여주지 않으면
 * "12000원"이 시급인지 월급인지 카드에서 알 수 없다.
 */
const SALARY_TYPE_LABELS: Record<string, string> = {
  hourly: "시급",
  daily: "일급",
  monthly: "월급",
  annual: "연봉",
};

/**
 * 카드·상세에 쓰는 급여. 종류와 금액을 갈라 돌려준다.
 * 카드에서 금액만 파랗게 두려면 "시급"과 "10,320원"이 따로 필요하다.
 *
 * 금액은 원문을 그대로 쓴다. salary_max 가 상한 미기재를 뜻하는 0 으로 들어온 건이
 * 2만여 건이라 min/max 로 다시 조립하면 "~ 0원" 같은 값이 나온다.
 * 다만 원문이 "X ~ X" 로 같은 값을 두 번 적은 경우(1.9만여 건)는 한 번만 보인다.
 */
export function splitSalary(job: Pick<Job, "salaryType" | "salaryText">): {
  typeLabel?: string;
  amount: string;
} {
  const text = job.salaryText?.trim();
  if (!text) return { amount: "급여 협의" };

  const [from, to] = text.split("~").map((part) => part.trim());
  const amount = to && from === to ? from : text;

  return {
    typeLabel: job.salaryType ? SALARY_TYPE_LABELS[job.salaryType] : undefined,
    amount: withThousands(amount),
  };
}

/** 한 줄 텍스트가 필요한 곳(상세 정보행 등)에서 쓴다. */
export function formatSalary(job: Pick<Job, "salaryType" | "salaryText">): string {
  const { typeLabel, amount } = splitSalary(job);
  return typeLabel ? `${typeLabel} ${amount}` : amount;
}

/**
 * "12000원" -> "12,000원". 시급·일급은 원 단위 그대로 와서 자릿점이 없으면 읽기 어렵다.
 * "250만원"처럼 만 단위로 줄인 표기는 네 자리를 넘지 않아 그대로 지나간다.
 */
function withThousands(text: string): string {
  return text.replace(/\d{4,}/g, (digits) => Number(digits).toLocaleString("ko-KR"));
}
