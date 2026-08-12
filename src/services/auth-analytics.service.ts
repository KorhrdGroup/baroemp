import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { isSupabaseMode } from "@/lib/data/mode";

export interface AuthAnalyticsSnapshot {
  /** 전체 가입 회원 수 (profiles 전체) */
  totalMembers: number;
  /** 최근 7일 신규가입 (스펙 30: 신규회원 수) */
  newMembersLast7d: number;
  /** 최근 30일 신규가입 */
  newMembersLast30d: number;
  /** 최근 7일 로그인 완료 이벤트 수 (login_completed, 스펙 30: 로그인 수) */
  loginsLast7d: number;
  /** 최근 30일 로그인 완료 이벤트 수 */
  loginsLast30d: number;
  /** 최근 7일 내 활동(last_active_at) 회원 수 (스펙 30: 활성회원 수) */
  activeMembersLast7d: number;
  /** 최근 30일 내 활동 회원 수 */
  activeMembersLast30d: number;
  /** 최근 30일 signup_completed 이벤트 수 (스펙 30: 회원가입 수 — profiles.created_at과 별개로 이벤트 기준 집계) */
  signupCompletedLast30d: number;
  /** Member-first Funnel: 방문 → 회원가입 → 직업진단 → 채용조회 → 지원금진단 (스펙 30) */
  funnel: {
    totalMembers: number;
    assessmentStarted: number;
    assessmentCompleted: number;
    jobViewed: number;
    supportStarted: number;
    supportCompleted: number;
  };
  /** utm_source별 실제 가입 회원 수 (user_acquisition 기준, mock이 아닌 실데이터) */
  signupsByUtmSource: Array<{ key: string; count: number }>;
}

const EMPTY_SNAPSHOT: AuthAnalyticsSnapshot = {
  totalMembers: 0,
  newMembersLast7d: 0,
  newMembersLast30d: 0,
  loginsLast7d: 0,
  loginsLast30d: 0,
  activeMembersLast7d: 0,
  activeMembersLast30d: 0,
  signupCompletedLast30d: 0,
  funnel: {
    totalMembers: 0,
    assessmentStarted: 0,
    assessmentCompleted: 0,
    jobViewed: 0,
    supportStarted: 0,
    supportCompleted: 0,
  },
  signupsByUtmSource: [],
};

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function countDistinctUserIdsFromRows(table: string, rows: unknown, error: unknown): number {
  if (error) throwDataSourceError(`authAnalytics.${table}`, error);
  const list = (rows ?? []) as Array<{ user_id: string }>;
  return new Set(list.map((r) => String(r.user_id))).size;
}

/**
 * STEP 6 [30] /admin/analytics Auth 관련 지표.
 *
 * 회원가입/로그인/활성회원/신규회원 수와 Member-first Funnel(방문→가입→직업진단→채용조회→지원금진단)을
 * 실제 Supabase 데이터(profiles, activity_events, assessment 관련 테이블, support_assessment_sessions, user_acquisition)로 집계한다.
 * Mock Mode에서는 빈 스냅샷을 반환한다 (STEP1 mock 회원 데이터에는 이 지표들에 대응하는 개념이 없음).
 */
export async function getAuthAnalyticsSnapshot(): Promise<AuthAnalyticsSnapshot> {
  if (!isSupabaseMode()) return EMPTY_SNAPSHOT;

  const client = createAdminSupabaseClient();
  if (!client) {
    throwDataSourceError("getAuthAnalyticsSnapshot", new Error("Supabase admin client unavailable"));
  }

  const since7d = daysAgoIso(7);
  const since30d = daysAgoIso(30);

  const [
    totalMembersRes,
    newMembers7dRes,
    newMembers30dRes,
    logins7dRes,
    logins30dRes,
    active7dRes,
    active30dRes,
    signupCompleted30dRes,
    acquisitionRes,
  ] = await Promise.all([
    client.from("profiles").select("id", { count: "exact", head: true }),
    client.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7d),
    client.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since30d),
    client
      .from("activity_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "login_completed")
      .gte("occurred_at", since7d),
    client
      .from("activity_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "login_completed")
      .gte("occurred_at", since30d),
    client.from("profiles").select("id", { count: "exact", head: true }).gte("last_active_at", since7d),
    client.from("profiles").select("id", { count: "exact", head: true }).gte("last_active_at", since30d),
    client
      .from("activity_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "signup_completed")
      .gte("occurred_at", since30d),
    client.from("user_acquisition").select("utm_source").not("utm_source", "is", null),
  ]);

  for (const [label, res] of [
    ["totalMembers", totalMembersRes],
    ["newMembers7d", newMembers7dRes],
    ["newMembers30d", newMembers30dRes],
    ["logins7d", logins7dRes],
    ["logins30d", logins30dRes],
    ["active7d", active7dRes],
    ["active30d", active30dRes],
    ["signupCompleted30d", signupCompleted30dRes],
    ["acquisition", acquisitionRes],
  ] as const) {
    if (res.error) throwDataSourceError(`getAuthAnalyticsSnapshot.${label}`, res.error);
  }

  const [assessmentSessionsRes, assessmentResultsRes, jobInterestsRes, supportSessionsRes, supportCompletedRes] =
    await Promise.all([
      client.from("assessment_sessions").select("user_id").not("user_id", "is", null),
      client.from("assessment_results").select("user_id").not("user_id", "is", null),
      client.from("user_job_interests").select("user_id").not("user_id", "is", null),
      client.from("support_assessment_sessions").select("user_id").not("user_id", "is", null),
      client
        .from("support_assessment_sessions")
        .select("user_id")
        .eq("status", "completed")
        .not("user_id", "is", null),
    ]);

  const assessmentStarted = countDistinctUserIdsFromRows(
    "assessment_sessions",
    assessmentSessionsRes.data,
    assessmentSessionsRes.error,
  );
  const assessmentCompleted = countDistinctUserIdsFromRows(
    "assessment_results",
    assessmentResultsRes.data,
    assessmentResultsRes.error,
  );
  const jobViewed = countDistinctUserIdsFromRows("user_job_interests", jobInterestsRes.data, jobInterestsRes.error);
  const supportStarted = countDistinctUserIdsFromRows(
    "support_assessment_sessions",
    supportSessionsRes.data,
    supportSessionsRes.error,
  );
  const supportCompleted = countDistinctUserIdsFromRows(
    "support_assessment_sessions.completed",
    supportCompletedRes.data,
    supportCompletedRes.error,
  );

  const utmSourceCounts = new Map<string, number>();
  for (const row of acquisitionRes.data ?? []) {
    const source = (row as { utm_source: string | null }).utm_source ?? "direct";
    utmSourceCounts.set(source, (utmSourceCounts.get(source) ?? 0) + 1);
  }

  return {
    totalMembers: totalMembersRes.count ?? 0,
    newMembersLast7d: newMembers7dRes.count ?? 0,
    newMembersLast30d: newMembers30dRes.count ?? 0,
    loginsLast7d: logins7dRes.count ?? 0,
    loginsLast30d: logins30dRes.count ?? 0,
    activeMembersLast7d: active7dRes.count ?? 0,
    activeMembersLast30d: active30dRes.count ?? 0,
    signupCompletedLast30d: signupCompleted30dRes.count ?? 0,
    funnel: {
      totalMembers: totalMembersRes.count ?? 0,
      assessmentStarted,
      assessmentCompleted,
      jobViewed,
      supportStarted,
      supportCompleted,
    },
    signupsByUtmSource: [...utmSourceCounts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count),
  };
}
