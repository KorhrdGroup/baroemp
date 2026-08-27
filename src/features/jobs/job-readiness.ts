import type { Job } from "@/types";

export type JobReadinessLevel = "no_requirement" | "satisfied" | "near" | "gap";

export interface JobReadiness {
  level: JobReadinessLevel;
  /** 배지에 그대로 쓰는 문구. 계산 내용을 그대로 적어 배지 자체가 근거가 되게 한다. */
  label: string;
}

function holds(held: string[], qualification: string): boolean {
  return held.some((h) => h && (qualification.includes(h) || h.includes(qualification)));
}

/**
 * 공고의 우대·필요 자격과 회원의 보유 자격만 비교한다.
 *
 * 문구를 "취업준비성 매우 높음"처럼 등급으로 두면 경력·학력까지 본다는 인상을 주는데,
 * 실제로 보는 건 자격 하나뿐이다. 특히 "매우 높음"의 상당수는 내가 잘 준비되어서가 아니라
 * 공고가 자격을 요구하지 않아서다. 그래서 등급 대신 판단 근거를 그대로 문구로 쓴다.
 *
 * 공고 데이터에 필수/우대 구분이 정리되면(검토서 4장 ②) 그 기준으로 교체한다.
 */
export function computeJobReadiness(job: Job, heldQualifications: string[]): JobReadiness {
  const quals = job.preferredQualifications ?? [];
  if (quals.length === 0) {
    return { level: "no_requirement", label: "자격 요건 없음" };
  }
  if (quals.some((q) => holds(heldQualifications, q))) {
    return { level: "satisfied", label: "보유 자격 충족" };
  }
  const missing = quals.filter((q) => !holds(heldQualifications, q));
  if (missing.length <= 1) {
    return { level: "near", label: "자격 1개 더 필요" };
  }
  return { level: "gap", label: `자격 ${missing.length}개 필요` };
}

/**
 * 초록은 "내가 갖춘 것"에만 쓴다.
 * 자격 요건이 없는 건 공고 쪽 사실이지 회원의 성취가 아니라서 무채색으로 둔다.
 */
export const READINESS_BADGE_CLASS: Record<JobReadinessLevel, string> = {
  no_requirement: "bg-slate-100 text-slate-600",
  satisfied: "bg-emerald-50 text-emerald-700",
  near: "bg-brand-blue-50 text-brand-blue-700",
  gap: "bg-amber-50 text-amber-700",
};
