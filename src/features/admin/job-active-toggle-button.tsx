"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleJobActiveAction } from "@/app/admin/actions";

export function JobActiveToggleButton({ jobId, isActive }: { jobId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(async () => { await toggleJobActiveAction(jobId); })}
    >
      {isActive ? "비활성화" : "다시 활성화"}
    </Button>
  );
}
