import type { Job } from "@/types";

export type JobReadinessLevel = "very_high" | "high" | "normal";

export interface JobReadiness {
  level: JobReadinessLevel;
  label: string;
  /** 배지 옆/툴팁에 보여줄 한 줄 근거 */
  reason: string;
}

function holds(held: string[], qualification: string): boolean {
  return held.some((h) => h && (qualification.includes(h) || h.includes(qualification)));
}

/**
 * 취업준비성 1차 규칙 (기획 확정 전 임시 기준):
 * - 공고에 자격 요건이 없으면 → 매우 높음 (바로 지원 가능)
 * - 요건 중 하나라도 보유하면 → 매우 높음 (자격 보유)
 * - 미보유 요건이 1개면 → 높음 (자격 1개 준비 시 충족)
 * - 미보유 요건이 2개 이상이면 → 보통 (준비 필요)
 * 공고 데이터에 필수/우대 구분이 정리되면(검토서 4장 ②) 그 기준으로 교체한다.
 */
export function computeJobReadiness(job: Job, heldQualifications: string[]): JobReadiness {
  const quals = job.preferredQualifications ?? [];
  if (quals.length === 0) {
    return { level: "very_high", label: "매우 높음", reason: "자격 없이 지원 가능" };
  }
  if (quals.some((q) => holds(heldQualifications, q))) {
    return { level: "very_high", label: "매우 높음", reason: "관련 자격 보유" };
  }
  const missing = quals.filter((q) => !holds(heldQualifications, q));
  if (missing.length <= 1) {
    return { level: "high", label: "높음", reason: `${missing[0]} 취득 시 충족` };
  }
  return { level: "normal", label: "보통", reason: "관련 자격 준비 필요" };
}

export const READINESS_BADGE_CLASS: Record<JobReadinessLevel, string> = {
  very_high: "bg-emerald-50 text-emerald-700",
  high: "bg-brand-blue-50 text-brand-blue-700",
  normal: "bg-amber-50 text-amber-700",
};
