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
}: {
  jobId: string;
  status: JobApplicationStatus | null;
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
        className="h-11 shrink-0 rounded-xl border-slate-300 bg-white px-4 text-body-3 font-semibold text-brand-blue-600 hover:bg-white"
      >
        지원했어요
      </Button>
    );
  }

  const reached = JOB_APPLICATION_STATUS_ORDER.indexOf(status);
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
