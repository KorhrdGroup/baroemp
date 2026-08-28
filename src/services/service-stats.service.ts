import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  EMPLOYMENT_STATUS_LABELS,
  REGION_LABELS,
} from "@/lib/labels";
import { getJobInterestReport, type JobInterestReport } from "./job-interest-report.service";

/**
 * 통계의 서비스별 탭(채용공고·지원금·이력서)이 쓰는 집계.
 *
 * 직업진단은 볼 것이 많아 assessment-stats.service.ts로 따로 두고, 나머지 셋을 여기 모은다.
 * 세는 일은 전부 SQL(RPC)에서 끝낸다 - 행을 끌어와 클라이언트에서 세면
 * PostgREST 1000행 상한에 조용히 걸린다.
 */

/**
 * 공고 순위는 기간 선택과 무관하게 항상 최근 7일만 본다.
 * 공고는 며칠이면 마감돼 사라지므로, 90일치를 섞으면 지금 지원할 수 없는 공고가 위를 차지한다.
 * 창이 하루씩 밀리며 굴러가 지난주와 이번 주를 그대로 비교할 수 있다.
 */
export const JOB_RANKING_WINDOW_DAYS = 7;
export const JOB_RANKING_TOP_N = 10;

export interface CountRow {
  label: string;
  count: number;
}

export interface JobStats {
  windowDays: number;
  /** 최근 창 안에서 상세가 열린 공고 수. 순위에 보이는 10개가 전체 중 몇 개인지 알려준다. */
  viewedJobCount: number;
  totalViews: number;
  totalUniqueViewers: number;
  totalApplyClicks: number;
  topJobs: JobInterestReport["rows"];
  byCategory: JobInterestReport["byCategory"];
  byRegion: JobInterestReport["byRegion"];
  error?: string;
}

export async function getJobStats(): Promise<JobStats> {
  const report = await getJobInterestReport(JOB_RANKING_WINDOW_DAYS);
  const rows = report.rows;

  return {
    windowDays: JOB_RANKING_WINDOW_DAYS,
    viewedJobCount: rows.length,
    totalViews: rows.reduce((s, r) => s + r.viewCount, 0),
    totalUniqueViewers: rows.reduce((s, r) => s + r.uniqueViewers, 0),
    totalApplyClicks: rows.reduce((s, r) => s + r.applyClickCount, 0),
    // 순방문자 순으로 이미 정렬돼 온다. 조회수 총합은 한 사람의 연타에 부풀어 순위 기준으로 쓰지 않는다.
    topJobs: rows.slice(0, JOB_RANKING_TOP_N),
    byCategory: report.byCategory.slice(0, JOB_RANKING_TOP_N),
    byRegion: report.byRegion,
    error: report.error,
  };
}

/* ---------------------------------------------------------------- */

export interface SupportStats {
  startedCount: number;
  completedCount: number;
  completionRatePercent: number;
  byRegion: CountRow[];
  byEmploymentStatus: CountRow[];
  byIncomeBand: CountRow[];
  error?: string;
}

const INCOME_LABELS: Record<string, string> = {
  low: "낮은 편",
  middle: "보통",
  high: "높은 편",
  unknown: "모름",
};

type StatusRow = { status: string; session_count: number };
type AnswerRow = { answer_value: string; session_count: number };

function toCountRows(rows: AnswerRow[], labels?: Record<string, string>): CountRow[] {
  return rows.map((r) => ({
    label: r.answer_value ? (labels?.[r.answer_value] ?? r.answer_value) : "미입력",
    count: Number(r.session_count),
  }));
}

export async function getSupportStats(days: number): Promise<SupportStats> {
  const client = createAdminSupabaseClient();
  const empty: SupportStats = {
    startedCount: 0,
    completedCount: 0,
    completionRatePercent: 0,
    byRegion: [],
    byEmploymentStatus: [],
    byIncomeBand: [],
  };
  if (!client) return { ...empty, error: "Supabase 관리자 키가 설정되지 않았습니다." };

  const since = new Date();
  since.setDate(since.getDate() - days);
  const p_since = since.toISOString();

  const [progress, regions, statuses, incomes] = await Promise.all([
    client.rpc("admin_support_progress", { p_since }),
    client.rpc("admin_support_answer_breakdown", { p_since, p_key: "region" }),
    client.rpc("admin_support_answer_breakdown", { p_since, p_key: "employmentStatus" }),
    client.rpc("admin_support_answer_breakdown", { p_since, p_key: "incomeBand" }),
  ]);

  if (progress.error) return { ...empty, error: progress.error.message };

  const statusRows = (progress.data ?? []) as StatusRow[];
  const startedCount = statusRows.reduce((s, r) => s + Number(r.session_count), 0);
  const completedCount = statusRows
    .filter((r) => r.status === "completed")
    .reduce((s, r) => s + Number(r.session_count), 0);

  return {
    startedCount,
    completedCount,
    completionRatePercent: startedCount > 0 ? Math.round((completedCount / startedCount) * 100) : 0,
    byRegion: toCountRows((regions.data ?? []) as AnswerRow[], REGION_LABELS as Record<string, string>),
    byEmploymentStatus: toCountRows(
      (statuses.data ?? []) as AnswerRow[],
      EMPLOYMENT_STATUS_LABELS as Record<string, string>,
    ),
    byIncomeBand: toCountRows((incomes.data ?? []) as AnswerRow[], INCOME_LABELS),
  };
}

/* ---------------------------------------------------------------- */

export interface ResumeStats {
  totalCount: number;
  avgCompleteness: number;
  byStatus: CountRow[];
  byReviewStatus: CountRow[];
  byTemplate: CountRow[];
  error?: string;
}

const RESUME_STATUS_LABELS: Record<string, string> = {
  draft: "작성 중",
  completed: "작성 완료",
  archived: "보관",
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  not_requested: "요청 없음",
  requested: "첨삭 요청",
  in_review: "첨삭 중",
  completed: "첨삭 완료",
};

type ResumeRow = {
  status: string;
  review_status: string;
  template_id: string;
  resume_count: number;
  avg_completeness: number | null;
};

/** 한 축으로 접어 많은 순으로. RPC가 세 축을 한 번에 주므로 화면에서 쓸 축만 골라 합친다. */
function foldBy(rows: ResumeRow[], pick: (r: ResumeRow) => string, labels?: Record<string, string>): CountRow[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const raw = pick(row);
    const label = raw ? (labels?.[raw] ?? raw) : "미지정";
    map.set(label, (map.get(label) ?? 0) + Number(row.resume_count));
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getResumeStats(days: number): Promise<ResumeStats> {
  const client = createAdminSupabaseClient();
  const empty: ResumeStats = {
    totalCount: 0,
    avgCompleteness: 0,
    byStatus: [],
    byReviewStatus: [],
    byTemplate: [],
  };
  if (!client) return { ...empty, error: "Supabase 관리자 키가 설정되지 않았습니다." };

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await client.rpc("admin_resume_stats", { p_since: since.toISOString() });
  if (error) return { ...empty, error: error.message };

  const rows = (data ?? []) as ResumeRow[];
  const totalCount = rows.reduce((s, r) => s + Number(r.resume_count), 0);
  // 그룹마다 건수가 달라 단순 평균을 내면 작은 그룹이 과하게 반영된다. 건수로 가중한다.
  const weightedSum = rows.reduce((s, r) => s + Number(r.avg_completeness ?? 0) * Number(r.resume_count), 0);

  return {
    totalCount,
    avgCompleteness: totalCount > 0 ? Math.round((weightedSum / totalCount) * 10) / 10 : 0,
    byStatus: foldBy(rows, (r) => r.status, RESUME_STATUS_LABELS),
    byReviewStatus: foldBy(rows, (r) => r.review_status, REVIEW_STATUS_LABELS),
    byTemplate: foldBy(rows, (r) => r.template_id),
  };
}
