"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  JOB_APPLICATION_STATUS_LABELS,
  JOB_APPLICATION_STATUS_ORDER,
  type JobApplicationStatus,
} from "@/types";
import { clearJobApplicationAction, reportJobApplicationAction } from "./job-application-actions";

/**
 * 공고 한 줄 옆의 "지원했어요 → 면접 진행 → 취업 성공" 표시 컨트롤.
 * 아직 표시 전이면 버튼 하나, 표시했으면 세 칸 중 하나를 고르는 모양이 된다.
 * 잘못 눌렀을 때를 위해 "표시 취소"를 작게 둔다.
 */
export function JobApplicationStatusControl({
  jobId,
  status: initialStatus,
  layout = "inline",
}: {
  jobId: string;
  status: JobApplicationStatus | null;
  /** block: 좁은 카드(공고 상세 오른쪽 요약 카드) 폭을 꽉 채운다 - 단추 한 줄 또는 세 칸 묶음 + 아래 "표시 취소". */
  layout?: "inline" | "block";
}) {
  const router = useRouter();
  const [status, setStatus] = useState<JobApplicationStatus | null>(initialStatus);
  const [pending, startTransition] = useTransition();

  const report = (next: JobApplicationStatus) => {
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      try {
        await reportJobApplicationAction({ jobId, status: next });
        router.refresh(); // 절차 띠의 완료 표시까지 서버에서 다시 그린다.
      } catch {
        setStatus(previous);
      }
    });
  };

  const clear = () => {
    const previous = status;
    setStatus(null);
    startTransition(async () => {
      try {
        await clearJobApplicationAction({ jobId });
        router.refresh();
      } catch {
        setStatus(previous);
      }
    });
  };

  if (!status) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => report("applied")}
        className={cn(
          "shrink-0 rounded-xl border-slate-300 bg-white font-semibold text-brand-blue-600 hover:bg-white",
          layout === "block" ? "h-12 w-full text-body-2" : "h-11 px-4 text-body-3",
        )}
      >
        지원했어요
      </Button>
    );
  }

  const reached = JOB_APPLICATION_STATUS_ORDER.indexOf(status);

  /* 세 단계를 한 판에 붙인 칸 묶음. 단추마다 폭이 달라 줄이 들쭉날쭉하던 것을 같은 폭 세 칸으로 맞춘다. */
  if (layout === "block") {
    return (
      <div>
        <div role="radiogroup" aria-label="지원 상태" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
          {JOB_APPLICATION_STATUS_ORDER.map((value, i) => {
            const active = value === status;
            const passed = i < reached;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={pending}
                onClick={() => report(value)}
                className={cn(
                  "flex h-10 items-center justify-center gap-1 rounded-lg text-body-3 whitespace-nowrap",
                  active
                    ? "bg-brand-blue-400 font-bold text-white"
                    : passed
                      ? "font-semibold text-brand-blue-600"
                      : "font-semibold text-slate-700",
                )}
              >
                {(active || passed) && <Check className="size-3.5" />}
                {JOB_APPLICATION_STATUS_LABELS[value]}
              </button>
            );
          })}
        </div>
        <div className="mt-1 text-right">
          <button
            type="button"
            disabled={pending}
            onClick={clear}
            className="tap-44 relative text-body-3 font-medium text-slate-600"
          >
            표시 취소
          </button>
        </div>
      </div>
    );
  }
  /* 사이트의 다른 버튼과 같은 Button 을 쓴다. 알약 묶음은 옆의 "지원했어요"·2단계 버튼들과 결이 달랐다. */
  return (
    <div role="radiogroup" aria-label="지원 상태" className="flex shrink-0 flex-wrap items-center gap-1.5">
      {JOB_APPLICATION_STATUS_ORDER.map((value, i) => {
        const active = value === status;
        const passed = i < reached;
        return (
          <Button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            size="sm"
            variant={active ? "default" : "outline"}
            disabled={pending}
            onClick={() => report(value)}
            className={cn(
              "h-11 rounded-xl px-4 text-body-3",
              active
                ? "bg-brand-blue-400 font-bold text-white hover:bg-brand-blue-400"
                : passed
                  ? "border-slate-300 bg-white font-semibold text-brand-blue-600 hover:bg-white"
                  : "border-slate-300 bg-white font-semibold text-slate-700 hover:bg-white",
            )}
          >
            {(active || passed) && <Check className="size-3.5" />}
            {JOB_APPLICATION_STATUS_LABELS[value]}
          </Button>
        );
      })}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={clear}
        className="h-11 text-body-3 font-medium text-slate-600 hover:bg-transparent hover:text-slate-600"
      >
        표시 취소
      </Button>
    </div>
  );
}
