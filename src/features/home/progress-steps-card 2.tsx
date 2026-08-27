"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProgressStepItem } from "./progress-steps.data";

/** 진행 이력이 없을 때 단계를 한 칸씩 넘기는 주기 */
const AUTO_ADVANCE_MS = 2500;

interface ProgressStepsCardProps {
  steps: ProgressStepItem[];
  /** 단계 id -> 완료 여부 */
  status: Record<string, boolean>;
  isLoggedIn: boolean;
  /** 처음 선택해둘 단계. 보통 아직 남은 단계다. */
  defaultStepId: string | null;
}

export function ProgressStepsCard({
  steps,
  status,
  isLoggedIn,
  defaultStepId,
}: ProgressStepsCardProps) {
  // 숫자는 페이지 이동이 아니라 하단 안내문/버튼을 바꾸는 선택 컨트롤이다.
  const [selectedId, setSelectedId] = useState(defaultStepId ?? steps[0]?.id ?? "");

  // 완료한 단계가 하나라도 있으면 그 사람의 실제 현황이 화면의 주인공이다.
  // 이때 자동 순회는 현황을 덮어쓰므로 켜지 않는다.
  const hasProgress = steps.some((step) => status[step.id]);
  const [autoPlay, setAutoPlay] = useState(!hasProgress);

  useEffect(() => {
    if (!autoPlay || steps.length < 2) return;
    // 움직임을 줄이도록 설정한 사용자에게는 자동 전환을 걸지 않는다.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = setInterval(() => {
      setSelectedId((current) => {
        const index = steps.findIndex((step) => step.id === current);
        return steps[(index + 1) % steps.length].id;
      });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [autoPlay, steps]);

  function selectStep(id: string) {
    setSelectedId(id);
    setAutoPlay(false); // 직접 고른 순간부터는 자동 전환이 방해가 된다.
  }

  const selected = steps.find((s) => s.id === selectedId) ?? steps[0];
  const selectedDone = selected ? status[selected.id] : false;

  return (
    <div className="rounded-xl bg-white p-6 ring-1 ring-border sm:p-8">
      <ol className="relative grid grid-cols-5 gap-2">
        {/* 원들을 잇는 구조선. 단계는 순서와 무관하게 완료할 수 있으므로 채우지 않는다. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-[10%] right-[10%] top-[18px] h-px bg-border sm:top-5"
        />
        {steps.map((step) => {
          const done = status[step.id];
          const active = step.id === selected?.id;
          return (
            <li key={step.id} className="flex flex-col items-center text-center">
              <div className="relative flex w-full items-center">
                <button
                  type="button"
                  onClick={() => selectStep(step.id)}
                  aria-pressed={active}
                  aria-label={`${step.title} 단계 안내 보기`}
                  className={
                    "relative z-10 mx-auto flex size-9 cursor-pointer items-center justify-center rounded-full text-label-1 font-bold transition-all duration-300 sm:size-10 " +
                    (done
                      ? "bg-brand-blue-400 text-white"
                      : active
                        ? // 선택된 미완료 단계는 회색으로 두면 눈에 걸리지 않아 hover와 같은 연한 파랑을 쓴다.
                          "bg-brand-blue-50 text-brand-blue-600"
                        : "bg-slate-100 text-slate-400 hover:bg-brand-blue-50 hover:text-brand-blue-600") +
                    (active ? " ring-2 ring-brand-blue-400 ring-offset-2" : "")
                  }
                >
                  {done ? <Check className="size-4 sm:size-5" /> : step.step}
                </button>
              </div>
              <p
                className={
                  "mt-2 text-label-1 font-semibold transition-colors sm:text-body-2 " +
                  (done || active ? "text-slate-800" : "text-slate-400")
                }
              >
                {step.title}
              </p>
              <p className="mt-0.5 hidden text-label-2 text-slate-400 sm:block">{step.description}</p>
              {done && <span className="mt-1 text-label-2 font-semibold text-brand-blue-600">완료</span>}
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        {/* 자동 전환 중에는 문구가 계속 바뀌므로 스크린리더에 매번 읽어주지 않는다. */}
        <p aria-live={autoPlay ? "off" : "polite"} className="text-label-1 text-slate-500">
          {!selected
            ? null
            : !isLoggedIn
              ? selected.messages.guest
              : selectedDone
                ? selected.messages.done
                : selected.messages.todo}
        </p>
        <Button className="shrink-0 bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
          <Link href={selected?.href ?? "/jobs"}>
            {!selected
              ? "채용공고 보기"
              : !isLoggedIn
                ? `${selected.title}부터 시작하기`
                : selectedDone
                  ? `${selected.title} 다시 보기`
                  : `${selected.title} 하러 가기`}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
