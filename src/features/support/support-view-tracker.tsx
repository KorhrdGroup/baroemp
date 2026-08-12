"use client";

import { useEffect, useRef } from "react";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import { trackSupportViewedAction } from "@/features/support/support-actions";

/** 지원제도 상세 페이지 마운트 시 1회 SUPPORT_VIEWED를 기록한다. */
export function SupportViewTracker({
  supportProgramId,
  matchScore,
  eligibilityGrade,
}: {
  supportProgramId: string;
  matchScore?: number;
  eligibilityGrade?: string;
}) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void trackSupportViewedAction({
      supportProgramId,
      anonymousId: getOrCreateAnonymousId(),
      matchScore,
      eligibilityGrade,
    });
  }, [supportProgramId, matchScore, eligibilityGrade]);

  return null;
}
