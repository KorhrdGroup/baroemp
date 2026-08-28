"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

/**
 * 진단 제출 후 결과를 준비하는 동안 보여주는 전체 화면.
 *
 * 버튼 안 스피너만 돌면 무엇을 하는지 알 수 없고, 계산이 1초 안에 끝나 화면이 번쩍 지나간다.
 * 실제 처리 단계를 문구로 보여주면서 최소 노출 시간을 두어, 무엇을 하고 있는지 전달한다.
 * (최소 노출 시간은 부모가 제출 Promise와 함께 기다린다.)
 */
export function AnalyzingScreen({
  steps,
  durationMs = 2500,
  title = "분석 중입니다",
}: {
  /** 순서대로 보여줄 단계 문구 */
  steps: string[];
  /** 진행 바가 100%에 도달하기까지의 시간 */
  durationMs?: number;
  title?: string;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    // 진행 바는 실제 계산량이 아니라 경과 시간 기준이다 - 서버 단계별 진행률을 알 수 없다.
    const timer = window.setInterval(() => {
      const ratio = Math.min(1, (Date.now() - startedAt) / durationMs);
      setProgress(ratio * 100);
      if (ratio >= 1) window.clearInterval(timer);
    }, 60);
    return () => window.clearInterval(timer);
  }, [durationMs]);

  // 진행률에 맞춰 몇 번째 단계까지 왔는지 계산한다.
  const activeIndex = Math.min(steps.length - 1, Math.floor((progress / 100) * steps.length));

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-atomic-mono-50 px-6"
    >
      <div className="w-full max-w-[24.5rem]">
        <h2 className="text-center text-title-2 font-bold text-slate-900">{title}</h2>
        <p className="mt-2.5 text-center text-body-2 text-slate-500">잠시만 기다려 주세요</p>

        <div className="mt-8 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-blue-500 transition-[width] duration-150 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-right text-label-2 font-semibold text-brand-blue-600">{Math.round(progress)}%</p>

        <ul className="mt-7 flex flex-col gap-3.5">
          {steps.map((step, index) => {
            const done = index < activeIndex;
            const current = index === activeIndex;
            return (
              <li key={step} className="flex items-center gap-2.5">
                <span
                  className={[
                    "flex size-5 shrink-0 items-center justify-center rounded-full",
                    done ? "bg-brand-blue-500 text-white" : current ? "bg-brand-blue-50" : "bg-slate-200",
                  ].join(" ")}
                >
                  {done ? (
                    <Check className="size-3" aria-hidden />
                  ) : current ? (
                    <Loader2 className="size-3 animate-spin text-brand-blue-600" aria-hidden />
                  ) : null}
                </span>
                <span
                  className={[
                    "text-body-2",
                    done ? "text-slate-400" : current ? "font-semibold text-slate-900" : "text-slate-400",
                  ].join(" ")}
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
