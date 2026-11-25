import type { SupportEligibilityGrade } from "@/types";

/**
 * 지원금 적합등급 배지 색. 목록 카드·상세·마이페이지가 같은 등급을 같은 색으로 보여주기 위해 한 곳에 둔다.
 * 초록(높은 가능성) → 파랑(보통) → 주황(확인 필요) → 회색(낮음).
 */
export const GRADE_BADGE_CLASS: Record<SupportEligibilityGrade, string> = {
  HIGH: "bg-emerald-50 text-emerald-700",
  MEDIUM: "bg-brand-blue-50 text-brand-blue-700",
  CHECK_REQUIRED: "bg-orange-50 text-orange-700",
  LOW: "bg-slate-100 text-slate-500",
};
