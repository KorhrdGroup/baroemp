"use client";

import { useEffect, useRef } from "react";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import { trackJobViewedAction } from "@/features/jobs/job-actions";

/** Job Detail 페이지 마운트 시 1회 JOB_VIEWED를 기록한다. */
export function JobViewTracker({ jobId, matchScore }: { jobId: string; matchScore?: number }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void trackJobViewedAction({ jobId, anonymousId: getOrCreateAnonymousId(), matchScore });
  }, [jobId, matchScore]);

  return null;
}
