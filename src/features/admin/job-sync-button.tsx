"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncJobsAction } from "@/app/admin/actions";
import type { JobSyncSummary } from "@/types";

export function JobSyncButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<JobSyncSummary | null>(null);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        size="sm"
        className="bg-brand-blue-500 hover:bg-brand-blue-600"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const summary = await syncJobsAction();
            setResult(summary);
          });
        }}
      >
        <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />
        {pending ? "동기화 중..." : "채용공고 동기화"}
      </Button>
      {result && (
        <p className="text-right text-[12px] text-slate-500">
          {result.isMock && <span className="mr-1 font-semibold text-amber-600">[Mock Provider]</span>}
          신규 {result.newCount} · 업데이트 {result.updatedCount} · 비활성 {result.deactivatedCount} · 실패{" "}
          {result.errorCount}
        </p>
      )}
    </div>
  );
}
