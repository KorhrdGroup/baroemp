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

  useEffect(() => {
    const sentinel = document.getElementById(sentinelId);
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelId]);

  useEffect(() => {
    /*
      단계 카드들이 화면 가운데 띠(위 35% ~ 아래 55%)에 들어올 때 그 단계를 "보고 있는 단계"로 친다.
      카드 높이가 제각각이라 "가장 많이 보이는 것"보다 이 편이 덜 튄다.
    */
    const targets = steps
      .map((s) => document.getElementById(s.anchor.replace(/^#/, "")))
      .filter((el): el is HTMLElement => Boolean(el));
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActiveId(`#${hit.target.id}`);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [steps]);

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
              <li key={s.id} className="flex min-w-0 items-center gap-2">
                <Link
                  href={s.anchor}
                  tabIndex={visible ? 0 : -1}
                  aria-label={`${s.step}단계 ${s.title}${s.done ? " (완료)" : isNext ? " (다음 할 일)" : ""}`}
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full text-label-1 font-bold transition-colors sm:size-10",
                    s.done
                      ? "bg-brand-blue-400 text-white"
                      : isNext
                        ? "bg-brand-blue-50 text-brand-blue-600 ring-2 ring-brand-blue-400"
                        : "bg-slate-100 text-slate-500",
                    isActive && "ring-2 ring-offset-2 ring-brand-blue-600",
                  )}
                >
                  {s.done ? <Check className="size-4 sm:size-5" /> : s.step}
                </Link>
                {/* 좁은 화면에서는 원만 남긴다. 제목 다섯 개까지 넣으면 버튼이 밀려난다. */}
                <span
                  className={cn(
                    "hidden truncate text-label-1 font-semibold md:inline",
                    s.done || isNext || isActive ? "text-slate-800" : "text-slate-500",
                  )}
                >
                  {s.title}
                </span>
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
