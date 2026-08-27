"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * AI 첨삭 동작(점검/생성/다듬기) 공용 버튼.
 * 공용 Button의 KRDS 크기 규격(sm 40px / xs 32px)을 그대로 쓰고,
 * AI 동작임이 구분되도록 색만 소프트 블루로 통일한다.
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
  /** sm: 카드 헤더용(40px), xs: 입력칸 아래 인라인용(32px) */
  size?: "sm" | "xs";
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "bg-brand-blue-50 text-brand-blue-700 hover:bg-brand-blue-100 active:bg-brand-blue-100",
        className,
      )}
    >
      {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
      {children}
    </Button>
  );
}
