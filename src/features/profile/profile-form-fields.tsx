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

/** 보유 자격 선택지. 서버 액션도 읽어야 해서 qualification-options.ts 에 두고 여기서는 다시 내보낸다. */
export { QUALIFICATION_OPTIONS } from "./qualification-options";

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
        /* 고른 칩은 파랑으로 채운다. 선만 바꾸면 고른 것과 안 고른 것이 잘 구별되지 않는다. */
        "h-10 cursor-pointer rounded-full border px-4 text-body-3",
        selected
          ? "border-baro-blue bg-baro-blue font-bold text-white"
          : "border-slate-300 bg-white font-medium text-slate-700",
      )}
    >
      {children}
    </button>
  );
}
