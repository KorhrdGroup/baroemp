"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * 실 공공서비스 API의 본문은 안내문 전체(신청서류 목록까지)가 한 필드에 들어오는 경우가 많다.
 * 이 길이를 넘으면 접어두고 "더보기"로 펼치게 한다.
 */
const COLLAPSE_THRESHOLD = 400;

export function SupportLongText({ text, className }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = text.length > COLLAPSE_THRESHOLD;

  return (
    <div>
      <p className={cn("whitespace-pre-line", className, collapsible && !expanded && "line-clamp-6")}>
        {text}
      </p>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-2 cursor-pointer text-label-1 font-semibold text-brand-blue-600 hover:underline"
        >
          {expanded ? "접기" : "더보기"}
        </button>
      )}
    </div>
  );
}
