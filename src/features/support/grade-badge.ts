import type { SupportEligibilityGrade } from "@/types";

/**
 * 지원금 적합등급 배지 색. 목록 카드·상세·마이페이지가 같은 등급을 같은 색으로 보여주기 위해 한 곳에 둔다.
 * 초록(높은 가능성) → 파랑(보통) → 주황(확인 필요) → 회색(낮음).
 * /draft3 색 판(.draft3-theme) 안에서는 두 파랑만: 진한 파랑(높음) → 옅은 파랑(보통) → 회색(확인 필요 · 낮음).
 */
export const GRADE_BADGE_CLASS: Record<SupportEligibilityGrade, string> = {
  HIGH: "bg-emerald-50 text-emerald-700 in-[.draft3-theme]:bg-baro-blue in-[.draft3-theme]:text-white",
  MEDIUM: "bg-brand-blue-50 text-brand-blue-700 in-[.draft3-theme]:bg-baro-blue-50 in-[.draft3-theme]:text-baro-blue",
  CHECK_REQUIRED: "bg-orange-50 text-orange-700 in-[.draft3-theme]:bg-slate-100 in-[.draft3-theme]:text-slate-700",
  LOW: "bg-slate-100 text-slate-500 in-[.draft3-theme]:text-slate-600",
};
