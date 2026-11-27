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
      {/*
        공공데이터 원문은 "○ 항목", "- 세부" 같은 기호를 글자로 담아 보낸다. 그대로 찍으면 원자료처럼 보여서
        줄마다 기호를 떼고 점 목록(세부는 한 단 들여쓰기)으로 그린다. 기호가 없는 줄은 그대로 문단이다.
      */}
      <div className={cn(className, collapsible && !expanded && "line-clamp-6")}>
        {text.split("\n").map((raw, i) => {
          const line = raw.trim();
          if (!line) return <span key={i} className="block h-2" />;
          const top = line.match(/^[○●◦❍◯■□▶▷◆◇※*•·]\s*(.+)$/);
          const sub = top ? null : line.match(/^[-–‐]\s*(.+)$/);
          if (top || sub) {
            return (
              <span key={i} className={cn("block pl-[1em] -indent-[1em]", sub && "ml-[1em]")}>
                {sub ? "–" : "•"} {(top || sub)![1]}
              </span>
            );
          }
          return <span key={i} className="block">{line}</span>;
        })}
      </div>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="relative tap-44 mt-2 cursor-pointer text-body-3 font-semibold text-atomic-blue-600"
        >
          {expanded ? "접기" : "더보기"}
        </button>
      )}
    </div>
  );
}
