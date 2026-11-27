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

/**
 * compact: /draft3 머리글용. "화면 크기" 글과 칸막이 단추 대신, 크기가 커지는 "가" 두 글자만 옅은 회색 알약 안에 둔다.
 * 단계는 보통 · 크게(120%) 둘뿐 - 110% · 120% 는 차이가 작아 구분이 안 되고, 둘이면 켜고 끄는 것처럼 쉽다.
 * 고른 글자만 흰 동그라미로 띄운다. 무엇인지는 각 단추 이름(화면 크기 보통 · 크게)과 말풍선(title)이 알려 준다.
 * 다른 화면의 세 단계로 고른 110% 가 남아 있으면 "크게" 쪽으로 표시한다.
 */
const COMPACT_LEVELS = [
  { value: "1", label: "보통", size: "text-[13px]" },
  { value: "1.2", label: "크게", size: "text-[17px]" },
];

export function ScreenScaleControl({ compact = false }: { compact?: boolean }) {
  const scale = useSyncExternalStore(subscribe, readScale, () => "1");

  useEffect(() => {
    document.documentElement.style.zoom = scale === "1" ? "" : scale;
    // 머리글이 이 값으로 자기 확대를 되돌린다 (site-header-draft.tsx). 미디어 쿼리는 zoom 을 모르기 때문이다.
    document.documentElement.style.setProperty("--screen-scale", scale);
  }, [scale]);

  const choose = (value: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // 저장이 막힌 브라우저(사생활 보호 모드 등)에서는 기억하지 못할 뿐이다.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  if (compact) {
    return (
      <div role="group" aria-label="화면 크기" className="flex items-center gap-0.5 rounded-full bg-baro-field p-1">
        {COMPACT_LEVELS.map((level) => {
          const on = level.value === "1" ? scale === "1" : scale !== "1";
          return (
          <button
            key={level.value}
            type="button"
            aria-pressed={on}
            aria-label={`화면 크기 ${level.label}`}
            title={`화면 크기 ${level.label}`}
            onClick={() => choose(level.value)}
            className={cn(
              "relative tap-44 flex size-8 cursor-pointer items-center justify-center rounded-full leading-none transition-colors duration-200",
              level.size,
              on
                ? "bg-white font-semibold text-baro-navy shadow-chip"
                : "font-semibold text-slate-500",
            )}
          >
            가
          </button>
          );
        })}
      </div>
    );
  }

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
