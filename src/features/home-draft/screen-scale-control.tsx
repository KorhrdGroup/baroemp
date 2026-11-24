"use client";

import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

/**
 * 화면 크기 조절 (고용24 머리줄의 "글자·화면 설정"에 해당).
 *
 * 글자 토큰이 px 라 루트 글자 크기를 바꿔도 본문이 따라 커지지 않는다. 그래서 브라우저 확대와
 * 같은 방식(zoom)으로 화면 전체를 키운다. 고른 값은 이 브라우저에 기억해 다음 방문에도 유지한다.
 */
const STORAGE_KEY = "screen-scale";
const CHANGE_EVENT = "screen-scale-change";
const LEVELS = [
  { value: "1", label: "보통" },
  { value: "1.1", label: "크게" },
  { value: "1.2", label: "더 크게" },
];

function readScale(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return LEVELS.some((l) => l.value === saved) ? (saved as string) : "1";
  } catch {
    return "1";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

export function ScreenScaleControl() {
  const scale = useSyncExternalStore(subscribe, readScale, () => "1");

  useEffect(() => {
    document.documentElement.style.zoom = scale === "1" ? "" : scale;
  }, [scale]);

  const choose = (value: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // 저장이 막힌 브라우저(사생활 보호 모드 등)에서는 기억하지 못할 뿐이다.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <div role="group" aria-label="화면 크기" className="flex items-center gap-2">
      <span className="text-caption-1 font-semibold text-slate-600">화면 크기</span>
      <div className="flex overflow-hidden rounded-sm border border-slate-300 bg-white">
        {LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            aria-pressed={scale === level.value}
            onClick={() => choose(level.value)}
            className={cn(
              "h-6 cursor-pointer border-l border-slate-300 px-2.5 text-caption-1 first:border-l-0",
              scale === level.value
                ? "bg-brand-blue-400 font-semibold text-white"
                : "font-medium text-slate-600",
            )}
          >
            {level.label}
          </button>
        ))}
      </div>
    </div>
  );
}
