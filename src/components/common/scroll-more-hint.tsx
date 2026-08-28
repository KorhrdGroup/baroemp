"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/** 하단 고정 버튼이 가리는 높이. 이 영역에 걸쳐 있으면 아직 다 본 것이 아니다. */
const BOTTOM_CTA_HEIGHT = 120;

/**
 * "아래에 더 있어요" 힌트.
 *
 * 선택지가 화면을 넘치면 사용자가 보이는 것만 전부라고 생각하고 넘어간다.
 * 이 컴포넌트를 목록 맨 끝에 두면, 그 지점이 아직 화면 아래에 남아 있는 동안에만
 * 하단 고정 버튼 위에 힌트를 띄우고, 끝까지 내려오면 알아서 사라진다.
 *
 * IntersectionObserver는 요소가 화면 밖에서 화면 밖으로 옮겨갈 때(아래 밖 → 위 밖)
 * 콜백을 주지 않아 상태가 어긋난다. 스크롤 시점에 위치를 직접 재는 편이 정확하다.
 */
export function ScrollMoreHint({ label = "아래에 선택지가 더 있어요" }: { label?: string }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      setShow(el.getBoundingClientRect().top > window.innerHeight - BOTTOM_CTA_HEIGHT);
    };
    // 스크롤마다 재계산하면 과하므로 한 프레임에 한 번만 계산한다.
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      {/* 목록의 끝 지점. 이 지점이 보이면 더 볼 것이 없다는 뜻이다. */}
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />

      {show ? (
        // 힌트는 안내일 뿐이라 클릭을 가로채지 않는다.
        <div className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center px-4">
          <span className="flex animate-bounce items-center gap-1 rounded-full bg-slate-900/85 px-4 py-2 text-label-2 font-medium text-white shadow-lg backdrop-blur-sm">
            <ChevronDown className="size-4" aria-hidden />
            {label}
          </span>
        </div>
      ) : null}
    </>
  );
}
