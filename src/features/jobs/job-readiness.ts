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
  const preferred = items.filter((i) => i.jobLevel === "PREFERRED");

  // 지원을 막는 것이 가장 먼저다.
  const missing = required.filter((i) => i.userStatus === "NOT_SATISFIED");
  if (missing.length === 1) return { level: "near", label: `${missing[0].requirementName} 필요` };
  if (missing.length > 1) return { level: "gap", label: `자격 ${missing.length}개 필요` };

  if (required.length > 0) {
    // 모름(UNKNOWN)은 부족으로 세지 않는다. 회원이 자격을 안 적었을 뿐인데
    // "부족"을 붙이면 지원할 수 있는 자리를 단념시킨다.
    const met = required.find((i) => i.userStatus === "SATISFIED");
    return met
      ? { level: "satisfied", label: `${met.requirementName} 충족` }
      : { level: "near", label: `${required[0].requirementName} 필요` };
  }

  // 필수가 없으면 우대를 알려준다. 예전에는 이 경우도 "자격 요건 없음"이라
  // 우대 조건이 있는 공고와 아무 조건도 없는 공고가 똑같아 보였다.
  if (preferred.length > 0) {
    const met = preferred.find((i) => i.userStatus === "SATISFIED");
    return met
      ? { level: "satisfied", label: `${met.requirementName} 우대 충족` }
      : { level: "preferred", label: `${preferred[0].requirementName} 우대` };
  }

  return { level: "no_requirement", label: "자격 요건 없음" };
}


/**
 * 색이 곧 뜻이다.
 *   무채색  할 일 없음      자격 요건 없음
 *   초록    갖춤            ○○ 충족 · ○○ 우대 충족
 *
 * 필수와 우대는 색이 아니라 문구로 가른다("요양보호사 자격 충족" vs
 * "운전 가능 우대 충족"). 갖췄다는 사실은 같으므로 색을 나누면
 * 초록이 두 가지가 되어 오히려 읽기 어렵다.
 *   파랑    있으면 유리      ○○ 우대
 *   주황    지원을 막음      ○○ 필요 · 자격 N개 필요
 */
export const READINESS_BADGE_CLASS: Record<JobReadinessLevel, string> = {
  // 무채색: 지원에 지장이 없다. 요건이 아예 없거나, 우대라 없어도 그만이다.
  no_requirement: "bg-slate-100 text-slate-600",
  preferred: "bg-slate-100 text-slate-600",
  // 초록: 갖췄다.
  satisfied: "bg-emerald-50 text-emerald-700",
  // 주황: 지원이 막힌다. 개수만 다를 뿐 같은 뜻이라 같은 색을 쓴다.
  near: "bg-amber-50 text-amber-700",
  gap: "bg-amber-50 text-amber-700",
};
