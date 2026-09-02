import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 마이페이지 취업 절차 한 단계.
 * 가입한 사람이 "그다음 뭘 하지"를 고민하지 않게, 다섯 단계를 순서대로 보여주고
 * 아직 안 한 첫 단계를 다음 할 일로 세운다.
 */
export interface JourneyStep {
  id: string;
  step: number;
  title: string;
  /** 단계 아래 한 줄. "이력서 3 · 자기소개서 2"처럼 현황을 적는다. */
  detail: string;
  done: boolean;
  /** 이 단계를 하러 갈 곳 */
  href: string;
  /** 다음 할 일 버튼 문구 */
  actionLabel: string;
  /** 다음 할 일 안내문 */
  todoMessage: string;
  /** 페이지 안에서 이 단계 카드가 있는 자리 */
  anchor: string;
}

interface JourneyStepsProps {
  steps: JourneyStep[];
  userName: string;
  /** 다섯 단계를 다 마쳤을 때 제목. 취업까지 표시했으면 축하로 바꾼다. */
  completedTitle?: string;
}

export function JourneySteps({ steps, userName, completedTitle }: JourneyStepsProps) {
  const next = steps.find((s) => !s.done) ?? null;
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section aria-label="취업 절차" className="rounded-2xl bg-brand-blue-50 p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-body-1 font-bold text-slate-900">
          {next ? `${userName}님, 이제 ${next.step}단계 차례예요` : `${userName}님, ${completedTitle ?? "준비를 모두 마치셨어요"}`}
        </h2>
        <p className="text-label-1 font-semibold text-brand-blue-700">
          {doneCount} / {steps.length} 단계 완료
        </p>
      </div>

      {/*
        동그라미 다섯 개를 선으로 잇는다. 누르면 그 단계 카드로 내려간다.
        좁은 화면에서는 설명을 감추고 제목만 남긴다 - 다섯 칸에 두 줄씩 넣으면 글자가 깨진다.
      */}
      <ol className="relative mt-6 grid grid-cols-5 gap-1 sm:gap-2">
        <span aria-hidden className="pointer-events-none absolute left-[10%] right-[10%] top-5 h-px bg-brand-blue-200 sm:top-6" />
        {steps.map((s) => {
          const isNext = next?.id === s.id;
          return (
            <li key={s.id} className="flex flex-col items-center text-center">
              <Link
                href={s.anchor}
                aria-label={`${s.step}단계 ${s.title}${s.done ? " (완료)" : isNext ? " (다음 할 일)" : ""}`}
                className={cn(
                  "relative z-10 flex size-10 items-center justify-center rounded-full text-body-2 font-bold transition-colors sm:size-12 sm:text-body-1",
                  s.done
                    ? "bg-brand-blue-400 text-white"
                    : isNext
                      ? "bg-white text-brand-blue-600 ring-2 ring-brand-blue-400 ring-offset-2 ring-offset-brand-blue-50"
                      : "bg-white text-slate-400 ring-1 ring-brand-blue-200",
                )}
              >
                {s.done ? <Check className="size-5 sm:size-6" /> : s.step}
              </Link>
              <p
                className={cn(
                  "mt-2 break-keep text-label-2 font-semibold sm:text-label-1",
                  s.done || isNext ? "text-slate-800" : "text-slate-500",
                )}
              >
                {s.title}
              </p>
              <p className="mt-0.5 hidden break-keep text-label-2 text-slate-500 sm:block">{s.detail}</p>
            </li>
          );
        })}
      </ol>

      {/* 다음 할 일 하나만 크게. 다섯 개를 다 권하면 하나도 안 하게 된다. */}
      {next && (
        <div className="mt-6 flex flex-col gap-3 rounded-xl bg-white p-4 ring-1 ring-brand-blue-100 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="break-keep text-body-2 text-slate-700">{next.todoMessage}</p>
          <Button className="shrink-0 bg-brand-blue-400 hover:bg-brand-blue-600" size="lg" asChild>
            <Link href={next.href}>
              {next.actionLabel}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
