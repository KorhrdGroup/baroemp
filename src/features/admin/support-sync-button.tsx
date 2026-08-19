"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncSupportProgramsAction } from "@/app/admin/actions";
import type { SupportSyncSummary } from "@/types";

export function SupportSyncButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SupportSyncSummary | null>(null);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        size="sm"
        className="bg-brand-blue-500 hover:bg-brand-blue-600"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const summary = await syncSupportProgramsAction();
            setResult(summary);
          });
        }}
      >
        <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />
        {pending ? "동기화 중..." : "지원제도 동기화"}
      </Button>
      {result && (
        <p className="text-right text-label-2 text-slate-500">
          {result.isMock && <span className="mr-1 font-semibold text-amber-600">[Mock Provider]</span>}
          수집 {result.fetchedCount} · 신규 {result.newCount} · 업데이트 {result.updatedCount} · 비활성{" "}
          {result.deactivatedCount} · 실패 {result.errorCount}
          {result.relevantCount !== undefined && (
            <>
              {" "}
              · 취업관련 {result.relevantCount} · 상세보강 {result.enrichedCount ?? 0}
            </>
          )}
        </p>
      )}
    </div>
  );
}
