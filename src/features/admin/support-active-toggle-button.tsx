"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleSupportProgramActiveAction } from "@/app/admin/actions";

export function SupportActiveToggleButton({
  supportProgramId,
  isActive,
}: {
  supportProgramId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(async () => { await toggleSupportProgramActiveAction(supportProgramId); })}
    >
      {isActive ? "비활성화" : "다시 활성화"}
    </Button>
  );
}
