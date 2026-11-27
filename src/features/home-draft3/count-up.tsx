"use client";

import { useEffect, useState } from "react";

const DURATION_MS = 1000;

/**
 * 숫자가 0에서 value 까지 1초 동안 올라가며 나타난다(처음 한 번만). 공고 수에 눈이 가게.
 * 끝으로 갈수록 느려지게(easeOutCubic) 해 마지막 숫자를 읽을 틈을 준다.
 * 움직임 줄이기 설정이면 바로 최종 값. 화면 읽기 프로그램에는 최종 값만 읽힌다.
 * 자릿수가 늘며 폭이 흔들리지 않게 숫자 폭을 고정(tabular-nums)한다.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    // 움직임 줄이기면 시간을 0으로 - 첫 프레임에 바로 최종 값.
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : DURATION_MS;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const final = value.toLocaleString("ko-KR");
  return (
    <strong className={className} aria-label={final}>
      <span aria-hidden className="tabular-nums">
        {shown.toLocaleString("ko-KR")}
      </span>
    </strong>
  );
}
