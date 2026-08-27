"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * 뒤로가기 버튼. 브라우저 히스토리가 있으면 이전 화면(결과/목록)으로 돌아가
 * 스크롤·필터 상태를 유지하고, 직접 진입(딥링크) 시에는 fallbackHref로 이동한다.
 */
export function BackButton({ fallbackHref, label = "뒤로가기" }: { fallbackHref: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-label-1 font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
    >
      <ArrowLeft className="size-4" />
      {label}
    </button>
  );
}
