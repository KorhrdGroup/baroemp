import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { REGION_LABELS } from "@/lib/labels";
import { getJobCategoryNameMap, labelJobCategory } from "./job-category-name.service";
import type { Region } from "@/types";

/**
 * 공고별 관심 집계. 관리자 통계 페이지와 엑셀 내보내기가 쓴다.
 *
 * 회원 개인의 관심도를 쌓는 job-interest.service.ts와 이름은 비슷하지만 방향이 반대다.
 * 저쪽은 "이 사람이 어떤 직종에 관심 있나", 이쪽은 "이 공고를 사람들이 얼마나 봤나"다.
 *
 * 공고는 6만 건이 넘어 전량 조회는 타임아웃이 난다. 그래서 순서를 뒤집는다:
 * 먼저 activity_events에서 "상세가 열린 공고"만 집계로 추리고, 그 id로만 jobs를 조회한다.
 * 결과는 보통 수백~수천 건이라 자르지 않아도 되고, 꼬리까지 남는다.
 */

/** PostgREST의 in 필터에 한 번에 넣을 id 개수. URL 길이 한계를 넘지 않게 나눠 던진다. */
const ID_CHUNK_SIZE = 200;

export interface JobInterestRow {
  jobId: string;
  title: string;
  companyName: string;
  jobCategory: string;
  region: string;
  salaryText: string;
  /** 상세를 연 사람 수. 조회수와 달리 한 사람의 연타에 부풀지 않는다. */
  uniqueViewers: number;
  viewCount: number;
  /** 조회수 / 순방문자. 1을 크게 넘으면 다시 열어본 공고라는 뜻이다. */
  viewsPerViewer: number;
  bookmarkCount: number;
  applyClickCount: number;
  /** 지원클릭 / 순방문자. 조회는 많은데 이 값이 낮으면 제목만 끌린 공고다. */
  applyRatePercent: number;
  isActive: boolean;
}

export interface JobInterestSummaryRow {
  key: string;
  uniqueViewers: number;
  viewCount: number;
  applyClickCount: number;
}

export interface JobInterestReport {
  rows: JobInterestRow[];
  byCategory: JobInterestSummaryRow[];
  byRegion: JobInterestSummaryRow[];
  /** 집계를 못 불러온 경우. 화면은 빈 표 대신 이 사유를 보여준다. */
  error?: string;
}

const EMPTY_REPORT: JobInterestReport = { rows: [], byCategory: [], byRegion: [] };

interface InterestAggregate {
  job_id: string;
  unique_viewers: number;
  view_count: number;
  bookmark_count: number;
  apply_click_count: number;
}

interface JobRow {
  id: string;
  title: string | null;
  company_name: string | null;
  job_category: string | null;
  region: string | null;
  salary_text: string | null;
  is_active: boolean | null;
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function regionLabel(value: string | null): string {
  if (!value) return "";
  return REGION_LABELS[value as Region] ?? value;
}

/** 공고 행을 축으로 묶어 합산한다. 관심이 어느 직종·지역에 몰렸는지 보는 용도다. */
function summarize(rows: JobInterestRow[], pick: (row: JobInterestRow) => string): JobInterestSummaryRow[] {
  const map = new Map<string, JobInterestSummaryRow>();
  for (const row of rows) {
    const key = pick(row) || "미분류";
    const current = map.get(key) ?? { key, uniqueViewers: 0, viewCount: 0, applyClickCount: 0 };
    current.uniqueViewers += row.uniqueViewers;
    current.viewCount += row.viewCount;
    current.applyClickCount += row.applyClickCount;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.uniqueViewers - a.uniqueViewers);
}

type AdminClient = NonNullable<ReturnType<typeof createAdminSupabaseClient>>;

async function loadJobsByIds(client: AdminClient, ids: string[]): Promise<Map<string, JobRow>> {
  const found = new Map<string, JobRow>();
  for (let i = 0; i < ids.length; i += ID_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + ID_CHUNK_SIZE);
    const { data } = await client
      .from("jobs")
      .select("id, title, company_name, job_category, region, salary_text, is_active")
      .in("id", chunk);
    for (const row of (data ?? []) as JobRow[]) found.set(row.id, row);
  }
  return found;
}

export async function getJobInterestReport(days: number): Promise<JobInterestReport> {
  const client = createAdminSupabaseClient();
  if (!client) return { ...EMPTY_REPORT, error: "Supabase 관리자 키가 설정되지 않았습니다." };

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await client.rpc("admin_job_interest", { p_since: since.toISOString() });
  if (error) return { ...EMPTY_REPORT, error: error.message };

  const aggregates = (data ?? []) as InterestAggregate[];
  if (aggregates.length === 0) return EMPTY_REPORT;

  // 공고가 들고 있는 건 워크넷 직종코드(550102)라 그대로 쓰면 사람이 못 읽는다.
  const [jobs, categoryNames] = await Promise.all([
    loadJobsByIds(
      client,
      aggregates.map((a) => a.job_id),
    ),
    getJobCategoryNameMap(),
  ]);

  const rows: JobInterestRow[] = aggregates.map((a) => {
    // 공고가 지워졌어도 관심 기록은 남는다. 이름을 못 찾는다고 행을 버리면 조회수 합이 안 맞는다.
    const job = jobs.get(a.job_id);
    const uniqueViewers = Number(a.unique_viewers);
    const viewCount = Number(a.view_count);
    const applyClickCount = Number(a.apply_click_count);
    return {
      jobId: a.job_id,
      title: job?.title ?? "(삭제된 공고)",
      companyName: job?.company_name ?? "-",
      jobCategory: job?.job_category ? labelJobCategory(categoryNames, job.job_category) : "",
      region: regionLabel(job?.region ?? null),
      salaryText: job?.salary_text ?? "-",
      uniqueViewers,
      viewCount,
      viewsPerViewer: uniqueViewers > 0 ? Math.round((viewCount / uniqueViewers) * 10) / 10 : 0,
      bookmarkCount: Number(a.bookmark_count),
      applyClickCount,
      applyRatePercent: percent(applyClickCount, uniqueViewers),
      isActive: job?.is_active ?? false,
    };
  });

  return {
    rows,
    byCategory: summarize(rows, (r) => r.jobCategory),
    byRegion: summarize(rows, (r) => r.region),
  };
}
