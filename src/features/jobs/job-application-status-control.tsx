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
        className="shrink-0 text-brand-blue-600 hover:bg-brand-blue-50"
      >
        지원했어요
      </Button>
    );
  }

  const reached = JOB_APPLICATION_STATUS_ORDER.indexOf(status);
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label="지원 상태" className="flex rounded-full bg-slate-100 p-0.5">
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
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-label-2 font-semibold transition-colors",
                active
                  ? value === "hired"
                    ? "bg-emerald-500 text-white"
                    : "bg-brand-blue-400 text-white"
                  : passed
                    ? "text-slate-700"
                    : "text-slate-500 hover:text-slate-700",
              )}
            >
              {(active || passed) && <Check className="size-3" />}
              {JOB_APPLICATION_STATUS_LABELS[value]}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={clear}
        className="text-label-2 text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
      >
        표시 취소
      </button>
    </div>
  );
}
