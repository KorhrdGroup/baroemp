"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { recalculateLeadScoreAction } from "@/app/admin/actions";

export function RecalculateLeadButton({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        className="bg-brand-blue-500 hover:bg-brand-blue-600"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await recalculateLeadScoreAction(userId);
            setMessage(`재계산 완료: ${result.grade} / ${result.score}점`);
          });
        }}
      >
        {pending ? "재계산 중..." : "Lead 점수 재계산"}
      </Button>
      {message && <p className="text-[11px] text-slate-500">{message}</p>}
    </div>
  );
}
