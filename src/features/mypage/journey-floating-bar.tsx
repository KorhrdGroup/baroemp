"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { JourneyStep } from "./journey-steps";

interface JourneyFloatingBarProps {
  steps: JourneyStep[];
  /** 이 요소가 화면에서 사라지면 띠를 띄운다 (맨 위 절차 판의 id). */
  sentinelId: string;
}

/**
 * 절차 판이 화면 위로 밀려 올라간 뒤에도 단계가 보이게, 아래에 떠 있는 작은 띠.
 *
 * 단계 카드를 내려 읽다 보면 내가 몇 단계에 있고 다음이 뭔지 잊는다. 판은 크고 한 번만 나오므로
 * 그 판이 안 보일 때만 이 띠를 띄운다 (둘 다 보이면 같은 것이 두 번 있는 셈이다).
 * 지금 보고 있는 단계 카드에 맞춰 원이 하나 밝아진다.
 */
export function JourneyFloatingBar({ steps, sentinelId }: JourneyFloatingBarProps) {
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const next = steps.find((s) => !s.done) ?? null;

  /*
    처음에는 IntersectionObserver 를 썼는데, 탭이 숨겨진 채(백그라운드) 페이지가 열리면 관찰 콜백이
    한 번도 안 울려 띠가 영영 안 떴다. 스크롤 위치를 직접 재는 편이 단순하고 어디서나 같다.
    - 띠: 절차 판(sentinel)의 아래 끝이 화면 위로 올라가면 띄운다.
    - 밝은 원: 화면 위에서 35% 지점을 지난 마지막 단계 카드가 "보고 있는 단계"다.
  */
  useEffect(() => {
    const sentinel = document.getElementById(sentinelId);
    const targets = steps
      .map((s) => ({ anchor: s.anchor, el: document.getElementById(s.anchor.replace(/^#/, "")) }))
      .filter((t): t is { anchor: string; el: HTMLElement } => Boolean(t.el));

    /*
      requestAnimationFrame 으로 묶지 않는다. 탭이 숨겨져 있으면 프레임이 안 돌아 스크롤을 해도
      띠가 갱신되지 않았다. 재는 일이 rect 몇 개뿐이라 그냥 매번 잰다 (React 가 같은 값이면 안 그린다).
    */
    const measure = () => {
      /*
        기준선은 화면 맨 위가 아니라 고정 헤더의 아래 끝이다. 1단계 카드로 점프하면 절차 판 아래 끝이
        헤더 뒤(0~64px)에 걸려 눈에는 안 보이는데 "아직 화면 안"으로 쳐서 띠가 사라졌다.
      */
      const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
      if (sentinel) setVisible(sentinel.getBoundingClientRect().bottom < headerBottom);
      const line = window.innerHeight * 0.35;
      let current: string | null = null;
      for (const t of targets) if (t.el.getBoundingClientRect().top <= line) current = t.anchor;
      setActiveId(current);
    };

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", measure);
    };
  }, [sentinelId, steps]);

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "pointer-events-none fixed inset-x-3 bottom-3 z-40 flex justify-center transition-all duration-300 sm:inset-x-6 sm:bottom-5",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
    >
      <nav
        aria-label="취업 절차 (요약)"
        className={cn(
          "flex w-full max-w-5xl items-center gap-3 rounded-2xl bg-white/95 p-2.5 shadow-lg ring-1 ring-border backdrop-blur sm:gap-4 sm:px-4 sm:py-3",
          visible && "pointer-events-auto",
        )}
      >
        <ol className="flex min-w-0 flex-1 items-center justify-between gap-1 sm:gap-2">
          {steps.map((s) => {
            const isNext = next?.id === s.id;
            const isActive = activeId === s.anchor;
            return (
              <li key={s.id} className="flex min-w-0 items-center">
                {/* 원만 누르게 두면 글자를 눌렀을 때 아무 일도 없다. 원과 제목을 한 링크로 묶는다. */}
                <Link
                  href={s.anchor}
                  tabIndex={visible ? 0 : -1}
                  aria-label={`${s.step}단계 ${s.title}${s.done ? " (완료)" : isNext ? " (다음 할 일)" : ""}`}
                  className="group flex min-w-0 items-center gap-2 rounded-full pr-1 transition-colors hover:bg-slate-50"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full text-label-1 font-bold leading-none transition-colors sm:size-10",
                      s.done
                        ? "bg-brand-blue-400 text-white"
                        : isNext
                          ? "bg-brand-blue-50 text-brand-blue-600 ring-2 ring-brand-blue-400"
                          : "bg-slate-100 text-slate-500",
                      isActive && "ring-2 ring-offset-2 ring-brand-blue-600",
                    )}
                  >
                    {s.done ? <Check className="size-4 sm:size-5" /> : s.step}
                  </span>
                  {/* 좁은 화면에서는 원만 남긴다. 제목 다섯 개까지 넣으면 버튼이 밀려난다. */}
                  <span
                    className={cn(
                      "hidden truncate text-label-1 font-semibold group-hover:text-slate-900 md:inline",
                      s.done || isNext || isActive ? "text-slate-800" : "text-slate-500",
                    )}
                  >
                    {s.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        {next && (
          <Button className="shrink-0 bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
            <Link href={next.href} tabIndex={visible ? 0 : -1}>
              <span className="hidden sm:inline">{next.actionLabel}</span>
              <span className="sm:hidden">{next.step}단계</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        )}
      </nav>
    </div>
  );
}
