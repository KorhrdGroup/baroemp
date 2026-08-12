import type { ActivityEvent, ActivityEventInput } from "@/types";
import type { ActivityEventLogger } from "./event-logger";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";

function mapRow(row: Record<string, unknown>): ActivityEvent {
  return {
    id: String(row.id),
    userId: (row.user_id as string | null) ?? undefined,
    anonymousId: (row.anonymous_id as string | null) ?? undefined,
    sessionId: (row.session_id as string | null) ?? undefined,
    eventType: String(row.event_type),
    entityType: (row.entity_type as string | null) ?? undefined,
    entityId: (row.entity_id as string | null) ?? undefined,
    metadata: (row.metadata as Record<string, unknown> | undefined) ?? undefined,
    occurredAt: String(row.occurred_at),
  };
}

/**
 * Supabase `activity_events` 테이블 기반 로거.
 * Service Role Client 가 없으면 null 을 반환해 resolveRepository 정책(Mock 폴백/운영 에러)에 맡긴다.
 *
 * 이전 구현은 insert를 fire-and-forget(`void client.from(...)`)으로 처리해 실패를 완전히
 * 무시했고, 조회(`getRecentEvents`/`getEventsByUser`)도 프로세스 메모리만 읽어 서버리스
 * 환경에서 사실상 항상 빈 배열을 반환했다. 이번 수정으로 insert/조회 모두 실제 DB를 사용하고,
 * 에러는 DataSourceError로 던진다.
 */
export function createSupabaseActivityEventLogger(): ActivityEventLogger | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async log(input: ActivityEventInput): Promise<ActivityEvent> {
      const occurredAt = input.occurredAt ?? new Date().toISOString();
      const { data, error } = await client
        .from("activity_events")
        .insert({
          user_id: input.userId || null,
          anonymous_id: input.anonymousId || null,
          session_id: input.sessionId || null,
          event_type: input.eventType,
          entity_type: input.entityType ?? null,
          entity_id: input.entityId ?? null,
          metadata: input.metadata ?? {},
          source: "web",
          occurred_at: occurredAt,
        })
        .select("*")
        .single();

      if (error || !data) {
        throwDataSourceError("ActivityEventLogger.log", error ?? new Error("no data returned"));
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("[ActivityEvent:Supabase]", input.eventType, input.userId ?? input.anonymousId);
      }

      return mapRow(data as Record<string, unknown>);
    },

    async getRecentEvents(limit = 50): Promise<ActivityEvent[]> {
      const { data, error } = await client
        .from("activity_events")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(limit);
      if (error) throwDataSourceError("ActivityEventLogger.getRecentEvents", error);
      return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
    },

    async getEventsByUser(userId: string): Promise<ActivityEvent[]> {
      const { data, error } = await client
        .from("activity_events")
        .select("*")
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false })
        .limit(200);
      if (error) throwDataSourceError("ActivityEventLogger.getEventsByUser", error);
      return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
    },

    async linkAnonymousToUser(anonymousId: string, userId: string): Promise<number> {
      const { data, error } = await client
        .from("activity_events")
        .update({ user_id: userId, anonymous_id: null })
        .eq("anonymous_id", anonymousId)
        .is("user_id", null)
        .select("id");
      if (error) throwDataSourceError("ActivityEventLogger.linkAnonymousToUser", error);
      return (data ?? []).length;
    },
  };
}
