"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import {
  trackContentRecommendationClickAction,
  trackOccupationResultClickAction,
} from "./assessment-actions";

interface TrackedLinkProps extends ComponentProps<typeof Link> {
  sessionId: string;
  kind: "occupation" | "content";
  targetId: string;
  userId?: string;
  anonymousId?: string;
}

/** 클릭 시 OCCUPATION_RESULT_CLICKED / CONTENT_RECOMMENDATION_CLICKED 이벤트를 비동기로 기록한 뒤 정상 이동한다. */
export function TrackedLink({ sessionId, kind, targetId, userId, anonymousId, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        if (kind === "occupation") {
          void trackOccupationResultClickAction(sessionId, targetId, userId, anonymousId);
        } else {
          void trackContentRecommendationClickAction(sessionId, targetId, userId, anonymousId);
        }
        onClick?.(e);
      }}
    />
  );
}
