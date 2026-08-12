"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import { trackJobApplyClickAction } from "@/features/jobs/job-actions";

/**
 * [지원하러 가기] 버튼. sourceUrl로 이동하기 전에 반드시 Activity Event를 기록한다.
 * sourceUrl이 없는(직접등록/Mock) 공고는 이동 없이 안내만 표시한다.
 */
export function JobApplyButton({
  jobId,
  sourceUrl,
  className,
}: {
  jobId: string;
  sourceUrl?: string;
  className?: string;
}) {
  const handleClick = async () => {
    await trackJobApplyClickAction({ jobId, anonymousId: getOrCreateAnonymousId() });
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
      지원하러 가기
    </Button>
  );
}
