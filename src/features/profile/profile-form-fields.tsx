"use client";

import { cn } from "@/lib/utils";

/**
 * 취업 프로필 입력 화면(내 정보 수정 / 가입 후 온보딩)이 공유하는 조각.
 * 두 화면이 같은 필드를 다루므로 선택지와 칩 UI를 한 곳에 둔다.
 */
export const JOB_CATEGORY_OPTIONS: { code: string; label: string }[] = [
  { code: "care_worker", label: "요양보호사·돌봄" },
  { code: "social_worker", label: "사회복지사" },
  { code: "office_admin", label: "사무·행정직" },
  { code: "facility_cleaning", label: "시설관리·미화" },
  { code: "hospital_companion", label: "병원동행·간병" },
  { code: "logistics_driver", label: "배송·운전직" },
  { code: "other", label: "기타" },
];

/**
 * 보유 자격 선택지. 이름은 요건 사전(career_requirements, 0066)에 등록된 것과 맞춰
 * 온보딩 → 자격 승격 → 공고 배지·진단 프리필까지 같은 이름으로 흐르게 한다.
 * 성격별로 묶어 두었다 (돌봄·복지 → 교육·상담 → 실무). 편입·학위 같은 자격 아닌 항목은 뺀다.
 */
export const QUALIFICATION_OPTIONS: string[] = [
  // 돌봄·복지
  "요양보호사",
  "사회복지사 2급",
  "보육교사 2급",
  "장애영유아보육교사",
  // 교육·상담
  "평생교육사 2급",
  "청소년지도사 2급",
  "직업상담사 2급",
  "심리상담사",
  "정사서(준사서)",
  // 실무·기타
  "컴퓨터활용능력",
  "종합미용면허",
  "경비지도사",
  "1종 보통 운전면허",
];

export function ChipToggle({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-label-1 font-medium transition-colors",
        selected
          ? "border-brand-blue-400 bg-brand-blue-50 text-brand-blue-700"
          : "border-border text-slate-600 hover:border-brand-blue-300",
      )}
    >
      {children}
    </button>
  );
}
