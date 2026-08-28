import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * 관리자 통계 페이지(/admin/stats)의 "얼마나 쓰나" 구역용 기간별 추이.
 *
 * 다른 분석 서비스들은 activityEventLogger.getRecentEvents(3000)으로 최근 3000건만
 * 메모리에 올려 필터한다. 이벤트가 쌓이면 통계가 조용히 "최근 3000건 기준"으로 바뀌므로,
 * 여기서는 집계를 SQL(admin_event_daily_counts RPC)에서 끝낸다.
 */

/** 추이 그래프에 올릴 지표. 이벤트 종류를 그대로 쓰지 않고 서비스 단위로 묶는다. */
export const TREND_METRICS = [
  { key: "assessment", label: "직업진단 완료", eventTypes: ["assessment_completed"] },
  { key: "job", label: "채용공고 조회", eventTypes: ["job_detail_viewed"] },
  { key: "support", label: "지원금진단 완료", eventTypes: ["support_search_completed"] },
  { key: "resume", label: "이력서 작성", eventTypes: ["resume_created", "resume_updated"] },
] as const;

export type TrendMetricKey = (typeof TREND_METRICS)[number]["key"];

/** 하루치 한 줄. 지표별 건수를 열로 편다 - 차트가 그대로 받아 쓴다. */
export interface DailyTrendRow {
  day: string;
  assessment: number;
  job: number;
  support: number;
  resume: number;
}

export interface AdminStatsTrend {
  rows: DailyTrendRow[];
  /** 집계를 못 불러온 경우. 화면은 빈 차트 대신 이 사유를 구역 단위로 보여준다. */
  error?: string;
}

const EMPTY_TREND: AdminStatsTrend = { rows: [] };

function emptyRow(day: string): DailyTrendRow {
  return { day, assessment: 0, job: 0, support: 0, resume: 0 };
}

/** 이벤트 종류 → 지표 키. 어디에도 안 걸리는 종류는 추이에서 뺀다. */
function metricKeyOf(eventType: string): TrendMetricKey | null {
  for (const metric of TREND_METRICS) {
    if ((metric.eventTypes as readonly string[]).includes(eventType)) return metric.key;
  }
  return null;
}

/**
 * 데이터가 없는 날도 0으로 채운다.
 * 빠진 날을 그냥 두면 선그래프가 이어져 버려서, 이용이 없던 날이 있었던 날처럼 보인다.
 */
function fillMissingDays(counted: Map<string, DailyTrendRow>, days: number): DailyTrendRow[] {
  const rows: DailyTrendRow[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    rows.push(counted.get(key) ?? emptyRow(key));
  }
  return rows;
}

export async function getAdminStatsTrend(days: number): Promise<AdminStatsTrend> {
  const client = createAdminSupabaseClient();
  if (!client) return { ...EMPTY_TREND, error: "Supabase 관리자 키가 설정되지 않았습니다." };

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const { data, error } = await client.rpc("admin_event_daily_counts", {
    p_since: since.toISOString(),
  });
  if (error) return { ...EMPTY_TREND, error: error.message };

  const counted = new Map<string, DailyTrendRow>();
  for (const row of (data ?? []) as { day: string; event_type: string; event_count: number }[]) {
    const metric = metricKeyOf(row.event_type);
    if (!metric) continue;
    const current = counted.get(row.day) ?? emptyRow(row.day);
    current[metric] += Number(row.event_count);
    counted.set(row.day, current);
  }

  return { rows: fillMissingDays(counted, days) };
}
