"use client";

import { cn } from "@/lib/utils";

/**
 * 이력서 · 자기소개서 편집 화면의 큰 제목 칸.
 * 한 줄 입력칸은 휴대폰에서 긴 제목이 옆으로 잘려 "…자기소개…"처럼 보였다. 글이 길면 아래로 줄을 늘린다.
 * 제목이라 줄바꿈(Enter)은 받지 않는다.
 */
export function TitleField({
  value,
  onChange,
  className,
  ...props
}: Omit<React.ComponentProps<"textarea">, "value" | "onChange" | "rows"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      {...props}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
      }}
      // 그릴 때마다 글 높이에 맞춘다(처음 열 때 긴 제목도).
      ref={(el) => {
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }}
      className={cn("block resize-none overflow-hidden break-keep", className)}
    />
  );
}
