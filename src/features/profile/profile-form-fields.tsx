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
 * 보유 자격 선택지. 직업진단 자격증 문항(0017 시드)과 같은 목록이며, 이름이 곧 저장 값이다.
 * 진단 문항에 선택지를 추가하면 여기도 같이 맞춘다.
 */
export const QUALIFICATION_OPTIONS: string[] = [
  "요양보호사",
  "사회복지사 2급",
  "컴퓨터활용능력",
  "1종 보통 운전면허",
  "평생교육사 2급",
  "경비지도사",
  "직업상담사 2급",
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
