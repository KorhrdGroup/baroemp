"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recalculateMarketSnapshotAction } from "@/features/career-gap/career-gap-actions";

/** 관리자 "[시장 요구조건 다시 분석]" 버튼 (스펙 47번). Snapshot 캐시를 무시하고 강제 재계산한다. */
export function CareerGapRecalculateButton({
  occupationId,
  employmentDestinationId,
}: {
  occupationId: string;
  employmentDestinationId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await recalculateMarketSnapshotAction({ occupationId, employmentDestinationId });
          router.refresh();
        });
      }}
    >
      <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />
      {pending ? "재분석 중..." : "시장 요구조건 다시 분석"}
    </Button>
  );
}
