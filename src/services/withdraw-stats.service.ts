import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * 통계 > 회원 구성 탭의 "탈퇴 사유".
 *
 * 탈퇴는 계정을 지우므로 회원 표에는 아무것도 남지 않는다. 남는 곳은 활동 로그뿐이고,
 * 그 행도 회원 열이 비워진 채(SET NULL) 남아 누구인지는 알 수 없다 - 이유만 통계로 쓴다.
 *
 * 탈퇴는 드물어 한 기간에 수백 건을 넘지 않는다. 1000행 상한 안에서 끌어와 세고,
 * 혹시 넘치면 넘쳤다고 알린다 (조용히 틀린 숫자를 보여주지 않는다).
 */
export interface WithdrawReasonRow {
  label: string;
  count: number;
}

export interface WithdrawComment {
  occurredAt: string;
  reason?: string;
  detail: string;
}

export interface WithdrawStats {
  total: number;
  reasons: WithdrawReasonRow[];
  comments: WithdrawComment[];
  /** 1000행 상한에 걸려 일부만 셌는지. */
  truncated: boolean;
  error?: string;
}

const EMPTY: WithdrawStats = { total: 0, reasons: [], comments: [], truncated: false };

const PAGE_LIMIT = 1000;
/** 자유 의견은 최근 것부터 이만큼만 보여준다. 더 필요하면 엑셀로 받는다. */
const COMMENT_LIMIT = 10;

export async function getWithdrawStats(days: number): Promise<WithdrawStats> {
  const client = createAdminSupabaseClient();
  if (!client) return { ...EMPTY, error: "Supabase 관리자 키가 설정되지 않았습니다." };

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const { data, error } = await client
    .from("activity_events")
    .select("occurred_at, metadata")
    .eq("event_type", "account_withdrawn")
    .gte("occurred_at", since.toISOString())
    .order("occurred_at", { ascending: false })
    .limit(PAGE_LIMIT);

  if (error) return { ...EMPTY, error: error.message };

  const rows = (data ?? []) as { occurred_at: string; metadata: Record<string, unknown> | null }[];

  const counts = new Map<string, number>();
  const comments: WithdrawComment[] = [];
  for (const row of rows) {
    const reason = typeof row.metadata?.reason === "string" ? row.metadata.reason : "";
    // 이유를 고르지 않고 나간 사람도 세야 "몇 명이 말없이 떠났는지"가 보인다.
    const label = reason || "이유 미선택";
    counts.set(label, (counts.get(label) ?? 0) + 1);

    const detail = typeof row.metadata?.detail === "string" ? row.metadata.detail.trim() : "";
    if (detail && comments.length < COMMENT_LIMIT) {
      comments.push({ occurredAt: row.occurred_at, reason: reason || undefined, detail });
    }
  }

  const reasons = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    // 많은 것부터. 같으면 "이유 미선택"을 뒤로 보낸다 - 고른 이유가 먼저 읽혀야 한다.
    .sort((a, b) => b.count - a.count || (a.label === "이유 미선택" ? 1 : -1));

  return { total: rows.length, reasons, comments, truncated: rows.length >= PAGE_LIMIT };
}
