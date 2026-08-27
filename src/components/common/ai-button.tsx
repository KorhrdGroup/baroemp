"use client";

import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AI 첨삭 동작(점검/생성/다듬기) 공용 버튼.
 * 화면마다 outline 버튼/텍스트 링크로 흩어져 있던 AI 동작을 한 가지 모양으로 통일한다.
 * loading이면 스피너를 보여주고 자동으로 비활성화된다.
 */
export function AiButton({
  children,
  onClick,
  loading = false,
  disabled = false,
  size = "sm",
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** sm: 카드 헤더용, xs: 입력칸 아래 인라인용 */
  size?: "sm" | "xs";
  className?: string;
}) {
  const iconClass = size === "xs" ? "size-3" : "size-4";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex shrink-0 cursor-pointer items-center gap-1 rounded-full bg-brand-blue-50 font-medium text-brand-blue-700 transition-colors hover:bg-brand-blue-100 disabled:pointer-events-none disabled:opacity-50",
        size === "xs" ? "px-2.5 py-1 text-label-2" : "px-3 py-1.5 text-label-1",
        className,
      )}
    >
      {loading ? <Loader2 className={cn(iconClass, "animate-spin")} /> : <Sparkles className={iconClass} />}
      {children}
    </button>
  );
}
