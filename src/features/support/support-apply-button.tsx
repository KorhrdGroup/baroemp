"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import { trackSupportApplyClickAction } from "@/features/support/support-actions";

/** [공식 신청페이지 보기] 버튼. sourceUrl로 이동하기 전에 반드시 Activity Event를 기록한다. */
export function SupportApplyButton({
  supportProgramId,
  sourceUrl,
  className,
}: {
  supportProgramId: string;
  sourceUrl?: string;
  className?: string;
}) {
  const handleClick = async () => {
    await trackSupportApplyClickAction({ supportProgramId, anonymousId: getOrCreateAnonymousId() });
    if (sourceUrl) {
      window.open(sourceUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Button
      type="button"
      size="lg"
      className={className ?? "w-full bg-brand-blue-500 hover:bg-brand-blue-600"}
      onClick={() => void handleClick()}
    >
      <ExternalLink className="size-4" />
      공식 신청페이지 보기
    </Button>
  );
}
