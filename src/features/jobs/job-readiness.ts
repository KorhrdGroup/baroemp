import type { JobReadiness, JobReadinessLevel } from "@/types";
import type { JobRequirementComparisonItem } from "@/services/job-requirement-comparison.service";

export type { JobReadiness, JobReadinessLevel } from "@/types";

/**
 * 공고의 필수 자격과 회원의 준비 상태를 비교한다.
 *
 * 문구를 "취업준비성 매우 높음"처럼 등급으로 두면 경력·학력까지 본다는 인상을 주는데,
 * 실제로 보는 건 자격이다. 그래서 등급 대신 판단 근거를 그대로 문구로 쓴다.
 *
 * 판정 재료는 요건 비교(compareUserToJobsRequirements)다. 예전에는
 * job.preferredQualifications 를 봤는데 그 칼럼이 6.2만 건 전부 비어 있어
 * 모든 카드가 "자격 요건 없음"으로 나왔다.
 *
 * 모름(UNKNOWN)은 부족으로 세지 않는다. 회원이 자격을 안 적었을 뿐인데
 * "자격 필요"를 붙이면 지원할 수 있는 자리를 단념시킨다.
 */
export function readinessFromComparison(items: JobRequirementComparisonItem[]): JobReadiness {
  const required = items.filter((i) => i.jobLevel === "REQUIRED");
  if (required.length === 0) {
    return { level: "no_requirement", label: "자격 요건 없음" };
  }

  const missing = required.filter((i) => i.userStatus === "NOT_SATISFIED");
  if (missing.length === 0) {
    const satisfied = required.some((i) => i.userStatus === "SATISFIED");
    // 회원 자격 정보가 없어 모름(UNKNOWN)인 경우도 "필요"로 묶는다.
    // 두 경우의 문구가 같아("요양보호사 자격 필요") 색을 갈라 봐야
    // 읽는 사람에게 전달되는 차이가 없었다.
    return satisfied
      ? { level: "satisfied", label: "보유 자격 충족" }
      : { level: "near", label: `${required[0].requirementName} 필요` };
  }
  if (missing.length === 1) {
    return { level: "near", label: `${missing[0].requirementName} 필요` };
  }
  return { level: "gap", label: `자격 ${missing.length}개 필요` };
}

/**
 * 초록은 "내가 갖춘 것"에만 쓴다.
 * 자격 요건이 없는 건 공고 쪽 사실이지 회원의 성취가 아니라서 무채색으로 둔다.
 */
export const READINESS_BADGE_CLASS: Record<JobReadinessLevel, string> = {
  // 무채색은 "할 일이 없다"는 뜻으로만 쓴다. 요건이 있으면 반드시 색이 들어간다.
  no_requirement: "bg-slate-100 text-slate-600",
  satisfied: "bg-emerald-50 text-emerald-700",
  near: "bg-brand-blue-50 text-brand-blue-700",
  gap: "bg-amber-50 text-amber-700",
};
