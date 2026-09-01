"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * "아래에 더 있어요" 힌트.
 *
 * 선택지가 화면을 넘치는 문항에서만 호출부가 이 컴포넌트를 렌더한다.
 * 화면 높이로 넘침을 추측하면 기기마다 결과가 달라지고, 다 보이는데도 뜨는 일이 생긴다.
 * "이 문항은 길다"는 판단은 문항 쪽에서 고정값으로 정하고, 여기서는 한 가지만 본다:
 * 아직 내릴 스크롤이 남았는가. 한 번 끝까지 내려오면 다시 올라가도 띄우지 않는다.
 */
export function ScrollMoreHint({ label = "아래에 선택지가 더 있어요" }: { label?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let frame = 0;
    let seenScrollable = false;
    let done = false;
    const update = () => {
      frame = 0;
      if (done) return;
      const left = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (left > 1) {
        seenScrollable = true;
        setShow(true);
        return;
      }
      // 앞 문항에서 아래로 내려간 채 넘어오면 마운트 직후에도 바닥에 있다.
      // 한 번이라도 "내릴 게 남은" 상태를 본 뒤에야 다 봤다고 판단한다.
      // (문항이 바뀌면 맨 위로 스크롤되므로 곧 그 상태가 온다.)
      if (seenScrollable) done = true;
      setShow(false);
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

  if (!show) return null;

  return (
    // 힌트는 안내일 뿐이라 클릭을 가로채지 않는다.
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center px-4">
      <span className="flex animate-bounce items-center gap-1 rounded-full bg-slate-900/85 px-4 py-2 text-label-2 font-medium text-white shadow-lg backdrop-blur-sm">
        <ChevronDown className="size-4" aria-hidden />
        {label}
      </span>
    </div>
  );
}
