"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  직업진단 · 지원금 찾기 마무리 판의 첫 질문 카드. 가만히 있으면 그림으로만 읽혀, 누가 하나씩 눌러 보는 것처럼 움직인다.
  한 바퀴(2.4초): 커서가 다음 칸으로 미끄러져 가고(0.7초) → 닿는 그 순간 칸이 파랗게 골라지며 부드럽게 커졌다 돌아온다.
  커서는 카드 위에 한 장만 띄워 위치만 옮긴다 - 칸마다 새로 그리면 순간이동처럼 튀었다.
  움직임 줄이기를 켠 사람에게는 처음 고른 칸 하나만 멈춰 보여 주고 커서는 감춘다.
  눌러지지 않는 그림이라 aria-hidden 은 바깥에서 건다.
*/
const CYCLE = 2400;
/** 커서가 다음 칸까지 미끄러져 가는 시간. 닿는 때에 맞춰 칸을 고른다. */
const TRAVEL = 700;
const PRESS = 160;
/** 고른 칸이 커졌다 돌아오는 시간. */
const POP = 520;

export function FirstQuestionCard({ step, q, options, start }: { step: string; q: string; options: string[]; start: number }) {
  const [target, setTarget] = useState(start);
  const [picked, setPicked] = useState(start);
  const [pressing, setPressing] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const firstPick = useRef(true);

  // 고른 칸이 부드럽게 커졌다 제자리로. 처음 그릴 때는 건너뛴다.
  useEffect(() => {
    if (firstPick.current) {
      firstPick.current = false;
      return;
    }
    const chip = gridRef.current?.children[picked] as HTMLElement | undefined;
    chip?.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.06)", offset: 0.45 }, { transform: "scale(1)" }],
      { duration: POP, easing: "cubic-bezier(0.33, 0, 0.2, 1)" },
    );
  }, [picked]);

  // 커서가 갈 자리: 칸의 오른쪽 아래쯤(손가락이 글자를 가리지 않게).
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const place = () => {
      const chip = grid.children[target] as HTMLElement | undefined;
      if (!chip) return;
      setPos({ x: chip.offsetLeft + chip.offsetWidth * 0.72, y: chip.offsetTop + chip.offsetHeight * 0.55 });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [target]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let i = start;
    const id = setInterval(() => {
      i = (i + 1) % options.length;
      // 커서가 먼저 출발하고, 닿는 순간(TRAVEL 뒤) 고르기 · 누르기를 함께 - 칸 효과가 커서와 같은 때 보인다.
      setTarget(i);
      timers.push(
        setTimeout(() => {
          setPicked(i);
          setPressing(true);
        }, TRAVEL),
        setTimeout(() => setPressing(false), TRAVEL + PRESS),
      );
    }, CYCLE);
    return () => {
      clearInterval(id);
      timers.forEach(clearTimeout);
    };
  }, [options.length, start]);

  return (
    <div className="mx-auto w-full max-w-[26rem] translate-y-6 rounded-t-card bg-white p-6 pb-10 shadow-float">
      <div className="flex items-center justify-between text-caption-1 font-bold">
        <span className="text-baro-blue-600">{step}</span>
        <span className="text-slate-600">첫 질문</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-1/6 rounded-full bg-baro-blue" />
      </div>
      <p className="mt-5 text-title-3 font-bold break-keep text-slate-900">{q}</p>
      <div className="relative mt-4">
        <div ref={gridRef} className="grid grid-cols-2 gap-2">
          {options.map((o, i) => {
            const on = i === picked;
            return (
              <span
                key={o}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-xl px-2 py-3 text-center text-body-3 font-semibold break-keep",
                  "transition-colors duration-300 ease-out",
                  on ? "bg-baro-blue text-white" : "bg-baro-field text-slate-700",
                )}
              >
                {on && <Check className="size-4 shrink-0" strokeWidth={2.6} />}
                {o}
              </span>
            );
          })}
        </div>
        {pos && (
          <span
            className="pointer-events-none absolute top-0 left-0 transition-transform ease-[cubic-bezier(0.45,0,0.2,1)] motion-reduce:hidden"
            style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, transitionDuration: `${TRAVEL}ms` }}
          >
            <RoundCursor pressing={pressing} />
          </span>
        )}
      </div>
    </div>
  );
}

/** 동글동글한 흰 화살표. 모서리를 둥글게 이은 선 + 옅은 그림자로 흰 칸 · 파란 칸 어디서나 보이게. 누를 때 살짝 작아진다. */
function RoundCursor({ pressing }: { pressing: boolean }) {
  return (
    <svg
      width="26"
      height="28"
      viewBox="0 0 26 28"
      className={cn(
        "block origin-top-left drop-shadow-[0_3px_6px_rgba(15,40,90,0.28)] transition-transform duration-150 ease-out",
        pressing && "scale-90",
      )}
    >
      <path
        d="M4 3.5 C4 2.6 5 2.1 5.7 2.7 L21.4 15.6 C22.1 16.2 21.7 17.3 20.8 17.3 L13.6 17.6 L9.6 24.4 C9.1 25.2 7.9 25 7.7 24.1 Z"
        fill="#fff"
        stroke="#1E2B4A"
        strokeOpacity="0.22"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
