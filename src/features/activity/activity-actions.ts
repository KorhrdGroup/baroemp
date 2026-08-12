"use server";

import { logActivityEvent } from "@/lib/activity/event-logger";
import { recalculateLeadScore } from "@/services/lead-score.service";
import type { ActivityEventType } from "@/types";

/**
 * Lead Score에 영향을 주는 이벤트 타입.
 * scoring-rules.ts / signal-builder.ts에서 실제로 신호로 사용하는 이벤트만 포함한다.
 * 여기 없는 이벤트는 기록만 하고 재계산을 트리거하지 않는다 (불필요한 부하 방지).
 */
const LEAD_IMPACT_EVENT_TYPES = new Set<ActivityEventType>([
  "assessment_completed",
  "consultation_requested",
  "resume_review_requested",
  "cover_letter_review_requested",
  "support_program_detail_viewed",
  "job_detail_viewed",
  "job_apply_clicked",
  "job_bookmarked",
]);

export interface TrackActivityInput {
  userId?: string;
  anonymousId?: string;
  eventType: ActivityEventType;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 클라이언트 컴포넌트에서 호출하는 범용 활동 기록 Server Action.
 *
 * 이전에는 클라이언트 컴포넌트가 `activityEventLogger`(Supabase Admin Client 포함)를
 * 직접 import 해서 브라우저에서 실행했다. 그 결과 Supabase Mode에서도 이벤트가
 * DB에 저장되지 않고 브라우저 메모리에만 쌓였다가 새로고침과 함께 사라졌다.
 * Server Action으로 옮겨 실제로 서버에서 Supabase에 저장되도록 한다.
 *
 * userId가 있고 Lead Score에 영향을 주는 이벤트 타입이면 재계산을 트리거한다.
 * (비회원 상태의 데모 상호작용은 userId가 없으므로 재계산은 회원 전환 후에만 의미가 있다.)
 */
export async function trackActivityAction(input: TrackActivityInput): Promise<void> {
  await logActivityEvent({
    userId: input.userId,
    anonymousId: input.anonymousId,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
  });

  if (input.userId && LEAD_IMPACT_EVENT_TYPES.has(input.eventType)) {
    await recalculateLeadScore(input.userId);
  }
}
