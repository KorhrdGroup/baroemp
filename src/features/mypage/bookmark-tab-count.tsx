"use client";

import { useEffect, useState } from "react";
import { JOB_BOOKMARK_SYNC_EVENT } from "@/features/jobs/job-bookmark-button";
import { SUPPORT_BOOKMARK_SYNC_EVENT } from "@/features/support/support-bookmark-button";

/**
 * 찜한 목록 위 탭의 개수. 아래 카드에서 찜을 풀거나 다시 누르면 새로 고치지 않아도 바로 늘고 준다.
 * 찜 단추가 보내는 알림(…-bookmark-sync)을 듣는다.
 */
export function BookmarkTabCount({ kind, initial, className }: { kind: "jobs" | "support"; initial: number; className?: string }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const event = kind === "jobs" ? JOB_BOOKMARK_SYNC_EVENT : SUPPORT_BOOKMARK_SYNC_EVENT;
    const onSync = (e: Event) => {
      const { bookmarked } = (e as CustomEvent<{ bookmarked: boolean }>).detail;
      setCount((c) => Math.max(0, c + (bookmarked ? 1 : -1)));
    };
    window.addEventListener(event, onSync);
    return () => window.removeEventListener(event, onSync);
  }, [kind]);

  return <span className={className}>{count}</span>;
}
