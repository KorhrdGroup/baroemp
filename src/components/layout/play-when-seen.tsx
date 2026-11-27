"use client";

import { useEffect, useRef } from "react";

/**
 * 감싼 덩어리가 화면에 충분히(40%) 들어온 순간 data-play="on" 을 붙인다(한 번만).
 * 그림 속 움직임(.li-anim, globals.css)은 이 표시가 붙어야 시작한다 - 넓은 화면에서 구역이 화면 아래 끝에
 * 걸린 채 열리면, 구역 등장(Reveal)이 먼저 끝나 그림이 보기도 전에 다 움직여 버렸다.
 */
export function PlayWhenSeen({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        el.dataset.play = "on";
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
