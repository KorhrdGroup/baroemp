import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { AGE_GROUP_LABELS, EMPLOYMENT_STATUS_LABELS, REGION_LABELS } from "@/lib/labels";
import { getJobInterestReport } from "./job-interest-report.service";
import type { Region } from "@/types";

/**
 * 통계 > 회원 구성 탭이 쓰는 집계.
 *
 * 세는 일은 전부 SQL(RPC)에서 끝낸다. 행을 끌어와 클라이언트에서 세면
 * PostgREST 1000행 상한에 조용히 걸려, 회원이 늘어난 뒤부터 숫자가 틀어진다.
 */

export interface Slice {
  label: string;
  value: number;
  /** "미입력"처럼 값이 아니라 빈자리를 뜻하는 항목. 화면에서 흐리게 처리한다. */
  muted?: boolean;
}

export interface RankRow {
  label: string;
  value: number;
}

export interface Kpi {
  label: string;
  value: string;
  unit?: string;
  caption?: string;
  captionTone?: "ok" | "warn" | "muted";
  spark?: number[];
  ratio?: number;
  ratioTone?: "brand" | "warn";
}

export interface MemberComposition {
  totalMembers: number;
  kpis: Kpi[];
  insights: string[];
  ageGroups: Slice[];
  employmentStatus: Slice[];
  supportRegions: RankRow[];
  /** 상위에 들지 못한 나머지 지역. "그 외 N개 시·도" 한 줄로 접는다. */
  supportRegionsRest: { label: string; value: number };
  topJobs: RankRow[];
  error?: string;
}

const EMPTY: MemberComposition = {
  totalMembers: 0,
  kpis: [],
  insights: [],
  ageGroups: [],
  employmentStatus: [],
  supportRegions: [],
  supportRegionsRest: { label: "그 외", value: 0 },
  topJobs: [],
};

/** 지역 순위에 이름을 걸고 보여줄 개수. 나머지는 한 줄로 접는다. */
const REGION_TOP_N = 4;
const JOB_TOP_N = 6;

function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** 스파크라인은 0~1 비율만 받는다. 최댓값을 1로 두고 나머지를 그에 맞춘다. */
function normalize(values: number[]): number[] {
  const max = Math.max(...values, 1);
  return values.map((v) => v / max);
}

type CompositionRow = { dimension: string; key: string; member_count: number };
type RegionRow = { region: string; session_count: number };
type SignupRow = { day: string; signup_count: number };
type ActorSplitRow = { member_events: number; anonymous_events: number };

/** 코드 키를 사람이 읽는 이름으로. 값이 비어 있으면 "미입력"으로 모은다. */
function toSlices(rows: CompositionRow[], dimension: string, labels: Record<string, string>): Slice[] {
  return rows
    .filter((r) => r.dimension === dimension)
    .map((r) => ({
      label: r.key ? (labels[r.key] ?? r.key) : "미입력",
      value: Number(r.member_count),
      muted: !r.key,
    }))
    .sort((a, b) => {
      // 미입력은 값이 크더라도 항상 맨 아래에 둔다. 분포를 읽는 데 방해가 된다.
      if (a.muted !== b.muted) return a.muted ? 1 : -1;
      return b.value - a.value;
    });
}

/**
 * 최근 며칠치 신규 가입을 날짜 순서대로 편다. 가입이 없던 날은 0으로 채운다.
 * 스파크라인은 막대가 촘촘하면 못 읽으므로 기간과 무관하게 최근 며칠만 그린다.
 */
function dailySeries(rows: SignupRow[], days: number): number[] {
  const byDay = new Map(rows.map((r) => [r.day, Number(r.signup_count)]));
  const series: number[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    series.push(byDay.get(d.toISOString().slice(0, 10)) ?? 0);
  }
  return series;
}

/**
 * 숫자를 문장으로 옮긴다.
 *
 * 표를 읽을 줄 아는 사람만 쓸 화면이 아니라서, 눈에 띄는 쏠림은 글로 먼저 말해준다.
 * 근거가 약할 때(표본이 적을 때) 단정하지 않는 것이 이 요약의 핵심이다.
 */
function buildInsights(input: {
  ageGroups: Slice[];
  employmentStatus: Slice[];
  supportRegions: RankRow[];
  supportTotal: number;
  topJobs: RankRow[];
  anonymousShare: number;
}): string[] {
  const lines: string[] = [];

  const topRegion = input.supportRegions[0];
  if (topRegion && input.supportTotal > 0) {
    const share = percent(topRegion.value, input.supportTotal);
    if (share >= 50) {
      lines.push(
        `지원금 진단 ${input.supportTotal}건 중 ${topRegion.value}건(${share}%)이 ${topRegion.label}에서 나왔습니다. 다른 지역 유입이 거의 없습니다.`,
      );
    }
  }

  const ageTotal = input.ageGroups.reduce((s, a) => s + a.value, 0);
  const senior = input.ageGroups
    .filter((a) => a.label.startsWith("50") || a.label.startsWith("60") || a.label.startsWith("70"))
    .reduce((s, a) => s + a.value, 0);
  const topStatus = input.employmentStatus.find((s) => !s.muted);
  if (ageTotal > 0 && senior > 0) {
    const share = percent(senior, ageTotal);
    const statusPart = topStatus
      ? ` 가장 많은 취업상태는 "${topStatus.label}"(${percent(topStatus.value, ageTotal)}%)입니다.`
      : "";
    lines.push(`회원 연령대가 50대 이상에 ${share}% 몰려 있습니다.${statusPart}`);
  }

  // 표본이 적으면 순위가 우연히 갈린다. 그대로 두면 없는 신호를 읽게 된다.
  const jobTotal = input.topJobs.reduce((s, j) => s + j.value, 0);
  if (input.topJobs.length > 0 && jobTotal < 30) {
    lines.push(
      `직종 조회는 통틀어 ${jobTotal}건뿐입니다. 표본이 적어 순위는 아직 우연에 가깝습니다 — 기간을 늘려 다시 보세요.`,
    );
  }

  if (input.anonymousShare >= 30) {
    lines.push(
      `전체 활동의 ${input.anonymousShare}%가 비로그인 상태에서 일어났습니다. 이 사람들은 회원 구성 숫자에 잡히지 않습니다.`,
    );
  }

  return lines;
}

export async function getMemberComposition(days: number): Promise<MemberComposition> {
  const client = createAdminSupabaseClient();
  if (!client) return { ...EMPTY, error: "Supabase 관리자 키가 설정되지 않았습니다." };

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [composition, regions, signups, actors, members, consultations, jobInterest] = await Promise.all([
    client.rpc("admin_member_composition"),
    client.rpc("admin_support_region_counts", { p_since: sinceIso }),
    client.rpc("admin_daily_signups", { p_since: sinceIso }),
    client.rpc("admin_event_actor_split", { p_since: sinceIso }),
    client.from("profiles").select("id", { count: "exact", head: true }),
    client.from("consultations").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
    getJobInterestReport(days),
  ]);

  if (composition.error) return { ...EMPTY, error: composition.error.message };

  const compositionRows = (composition.data ?? []) as CompositionRow[];
  const ageGroups = toSlices(compositionRows, "age_group", AGE_GROUP_LABELS);
  const employmentStatus = toSlices(compositionRows, "employment_status", EMPLOYMENT_STATUS_LABELS);

  const regionRows = ((regions.data ?? []) as RegionRow[]).map((r) => ({
    label: r.region ? (REGION_LABELS[r.region as Region] ?? r.region) : "미입력",
    value: Number(r.session_count),
  }));
  const supportTotal = regionRows.reduce((s, r) => s + r.value, 0);
  const supportRegions = regionRows.slice(0, REGION_TOP_N);
  const restRegions = regionRows.slice(REGION_TOP_N);

  const signupRows = (signups.data ?? []) as SignupRow[];
  // 스파크라인은 최근 14일만 그리지만, 신규 가입 수는 고른 기간 전체를 세야 캡션과 맞는다.
  const signupSeries = dailySeries(signupRows, Math.min(days, 14));
  const newMembers = signupRows.reduce((sum, r) => sum + Number(r.signup_count), 0);

  const actorSplit = ((actors.data ?? []) as ActorSplitRow[])[0];
  const memberEvents = Number(actorSplit?.member_events ?? 0);
  const anonymousEvents = Number(actorSplit?.anonymous_events ?? 0);
  const anonymousShare = percent(anonymousEvents, memberEvents + anonymousEvents);

  const topJobs = jobInterest.byCategory.slice(0, JOB_TOP_N).map((row) => ({
    label: row.key,
    value: row.uniqueViewers,
  }));

  const totalMembers = members.count ?? 0;
  const topRegionShare = supportRegions[0] ? percent(supportRegions[0].value, supportTotal) : 0;

  const kpis: Kpi[] = [
    {
      label: "전체 회원",
      value: String(totalMembers),
      unit: "명",
      spark: normalize(signupSeries),
      caption: newMembers > 0 ? `최근 ${days}일 +${newMembers}명` : `최근 ${days}일 신규 없음`,
      captionTone: newMembers > 0 ? "ok" : "muted",
    },
    {
      label: "신규 가입",
      value: String(newMembers),
      unit: "명",
      spark: normalize(signupSeries),
      caption: `일 평균 ${(newMembers / Math.max(days, 1)).toFixed(1)}명`,
    },
    {
      label: "지원금 진단",
      value: String(supportTotal),
      unit: "건",
      ratio: topRegionShare / 100,
      caption: supportRegions[0] ? `${supportRegions[0].label} 비중 ${topRegionShare}%` : "데이터 없음",
    },
    {
      label: "상담 배정",
      value: String(consultations.count ?? 0),
      unit: "건",
      caption: `최근 ${days}일 기준`,
      captionTone: "muted",
    },
    {
      label: "비로그인 활동",
      value: String(anonymousShare),
      unit: "%",
      ratio: anonymousShare / 100,
      ratioTone: anonymousShare >= 30 ? "warn" : "brand",
      caption: anonymousShare >= 30 ? "가입 유도 지점 점검 필요" : "회원 활동이 대부분",
      captionTone: anonymousShare >= 30 ? "warn" : "muted",
    },
  ];

  return {
    totalMembers,
    kpis,
    insights: buildInsights({
      ageGroups,
      employmentStatus,
      supportRegions,
      supportTotal,
      topJobs,
      anonymousShare,
    }),
    ageGroups,
    employmentStatus,
    supportRegions,
    supportRegionsRest: {
      label: `그 외 ${restRegions.length}개 지역`,
      value: restRegions.reduce((s, r) => s + r.value, 0),
    },
    topJobs,
    error: jobInterest.error,
  };
}
