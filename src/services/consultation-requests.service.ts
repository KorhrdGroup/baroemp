import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * 취업 컨설팅 신청 조회 (어드민 전용).
 * 신청 폼은 아직 별도 테이블 없이 activity_events(consultation_requested)의 metadata로 쌓이므로
 * 여기서 이벤트를 영업/상담 담당자가 읽을 수 있는 행으로 풀어준다.
 * 전용 테이블로 옮기게 되면 이 서비스의 조회부만 바꾸면 된다.
 */
export interface ConsultationRequestRow {
  id: string;
  requestedAt: string;
  name: string;
  phone?: string;
  topic?: string;
  channel?: string;
  /** 로그인 상태로 신청했으면 회원 이름 (비회원 신청은 undefined) */
  memberName?: string;
  userId?: string;
}

export const CONSULTATION_CHANNEL_LABELS: Record<string, string> = {
  phone: "전화",
  video: "화상",
  in_person: "대면",
  chat: "채팅",
};

interface EventRow {
  id: string;
  user_id: string | null;
  occurred_at: string;
  metadata: Record<string, unknown> | null;
}

function metaText(metadata: Record<string, unknown> | null, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function getConsultationRequests(limit = 300): Promise<ConsultationRequestRow[]> {
  const admin = createAdminSupabaseClient();
  if (!admin) return [];

  const { data } = await admin
    .from("activity_events")
    .select("id, user_id, occurred_at, metadata")
    .eq("event_type", "consultation_requested")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  const events = (data ?? []) as EventRow[];

  // 회원 신청 건은 프로필 이름을 같이 보여준다 (폼 이름과 계정 이름이 다를 수 있다).
  const userIds = [...new Set(events.map((e) => e.user_id).filter(Boolean))] as string[];
  const memberNames = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, name").in("id", userIds);
    for (const p of profiles ?? []) memberNames.set(String(p.id), String(p.name ?? ""));
  }

  return events.map((e) => ({
    id: e.id,
    requestedAt: e.occurred_at,
    name: metaText(e.metadata, "name") ?? "이름 미입력",
    phone: metaText(e.metadata, "phone"),
    topic: metaText(e.metadata, "topic"),
    channel: metaText(e.metadata, "channel"),
    memberName: e.user_id ? memberNames.get(e.user_id) : undefined,
    userId: e.user_id ?? undefined,
  }));
}
