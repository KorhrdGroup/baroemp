"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * 하다 만 진단이 있을 때 시작 버튼을 누르는 순간 띄우는 확인 팝업.
 *
 * 소개 화면에 배너로 두면 그냥 지나치고 시작 버튼을 눌러 처음부터 다시 하게 된다.
 * 선택을 해야 넘어가는 시점에 물어야 이전 답변이 버려지지 않는다.
 */
export function ResumeSessionDialog({
  open,
  onOpenChange,
  answeredQuestions,
  totalQuestions,
  updatedAt,
  onResume,
  onRestart,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 진행한 문항 수 */
  answeredQuestions: number;
  /** 전체 문항 수 */
  totalQuestions: number;
  updatedAt?: string;
  onResume: () => void;
  onRestart: () => void;
  busy?: boolean;
}) {
  const percent = Math.min(100, Math.max(0, (answeredQuestions / Math.max(1, totalQuestions)) * 100));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-2xl p-0 sm:max-w-[480px]">
        <div className="px-6 pb-5 pt-6">
          <DialogHeader className="space-y-0 text-left">
            <DialogTitle className="pr-6 text-[19px] font-bold leading-[1.4] tracking-[-0.01em] text-slate-900">
              이전에 하던 진단이 있습니다
            </DialogTitle>
            <DialogDescription className="mt-2.5 text-[14px] leading-[1.65] text-slate-500">
              이어서 진행하시겠습니까? 처음부터 다시 하면 이전 답변은 사용되지 않습니다.
            </DialogDescription>
          </DialogHeader>

          {/* 어디까지 했는지 눈으로 보여줘야 "이어서 하기"를 고를 근거가 된다. */}
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-medium text-slate-600">진행 상황</span>
              <span className="text-[13px] font-bold text-slate-900">
                <span className="text-brand-blue-600">{answeredQuestions}</span> / {totalQuestions} 문항
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={answeredQuestions}
              aria-valuemin={0}
              aria-valuemax={totalQuestions}
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"
            >
              <div className="h-full rounded-full bg-brand-blue-600" style={{ width: `${percent}%` }} />
            </div>
            {updatedAt ? (
              <p className="mt-2.5 text-[12px] leading-none text-slate-400">
                마지막 진행 {updatedAt.slice(0, 10)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2.5 px-6 pb-6">
          <button
            type="button"
            onClick={onRestart}
            disabled={busy}
            className="h-[50px] flex-1 rounded-xl border border-slate-300 bg-white text-[15px] font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
          >
            처음부터 다시
          </button>
          <button
            type="button"
            onClick={onResume}
            disabled={busy}
            className="h-[50px] flex-[1.35] rounded-xl bg-brand-blue-600 text-[15px] font-bold text-white shadow-[0_6px_14px_-4px_rgba(37,99,235,0.5)] transition-colors hover:bg-brand-blue-700 disabled:opacity-50"
          >
            이어서 하기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
