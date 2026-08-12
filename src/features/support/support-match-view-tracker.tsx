"use client";

import { useEffect, useRef } from "react";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import { trackSupportMatchViewedAction } from "@/features/support/support-actions";

export interface SupportMatchViewItem {
  supportProgramId: string;
  matchScore: number;
  eligibilityGrade: string;
}

/** 결과 페이지 마운트 시 상위 매칭 카드들에 대해 1회 SUPPORT_MATCH_VIEWED를 기록한다. */
export function SupportMatchViewTracker({ items }: { items: SupportMatchViewItem[] }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current || items.length === 0) return;
    tracked.current = true;
    const anonymousId = getOrCreateAnonymousId();
    for (const item of items) {
      void trackSupportMatchViewedAction({
        supportProgramId: item.supportProgramId,
        anonymousId: anonymousId || undefined,
        matchScore: item.matchScore,
        eligibilityGrade: item.eligibilityGrade,
        context: "result_page",
      });
    }
  }, [items]);

  return null;
}
