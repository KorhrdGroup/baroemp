"use client";

import { useEffect, useRef } from "react";

/**
 * 구역이 처음 화면에 들어올 때 한 번만 아래에서 살짝 떠오른다(0.5초). 다시 올라갔다 내려와도 반복하지 않는다.
 * 처음 열었을 때 이미 보이는 구역은 건드리지 않는다 - 읽던 글이 깜빡이지 않게.
 * 숨김은 브라우저에서만 걸어서, 스크립트가 늦거나 없어도 내용은 늘 보인다. 움직임 줄이기면 끈다.
 * 숨김 · 보임은 data-reveal 로만 바꾼다(다시 그리기와 상관없이 유지되게).
 */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.dataset.reveal = "hidden";
    // 위치로 판단한다(겹침 감지 대신): End 키나 빠른 밀기로 구역을 건너뛰어도, 지나친 구역은 보이게 된다.
    const check = () => {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.9) return;
      el.dataset.reveal = "shown";
      window.removeEventListener("scroll", check);
    };
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,translate] duration-500 ease-out data-[reveal=hidden]:translate-y-6 data-[reveal=hidden]:opacity-0 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
