import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getJobInterestReport } from "./job-interest-report.service";
import { getSalesLeads, labelIncomeBand, labelInsurance, type SalesLeadRow } from "./sales-leads.service";
import { REGION_LABELS } from "@/lib/labels";
import type { SheetSpec } from "@/lib/export/workbook";
import type { Region } from "@/types";

/**
 * 관리자 엑셀 내보내기의 도메인별 시트 정의.
 *
 * 파일을 만드는 일은 lib/export/workbook.ts가 하고, 여기는 "무엇을 담을지"만 정한다.
 *
 * 개인정보는 넣지 않는다. 이름·연락처·이메일 대신 회원 id 앞 8자리만 쓴다.
 * 관리자 화면에 이미 CRM 상세가 있으므로 개인 식별은 그쪽에서 하고,
 * 내보내기는 집계·분석용으로 한정한다.
 *
 * 예외: "영업 리드"는 영업단 전달이 목적이라 이름·연락처를 담는다.
 * 마케팅 활용은 동의 여부 열을 보고 동의한 회원에 한해서 한다.
 */

export const EXPORT_DOMAINS = ["assessment", "jobs", "support", "resume", "leads"] as const;
export type ExportDomain = (typeof EXPORT_DOMAINS)[number];

export function isExportDomain(value: string): value is ExportDomain {
  return (EXPORT_DOMAINS as readonly string[]).includes(value);
}

export const EXPORT_LABELS: Record<ExportDomain, string> = {
  assessment: "직업진단",
  jobs: "채용공고",
  support: "지원금찾기",
  resume: "이력서첨삭",
  leads: "영업리드",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 시트마다 행 타입이 달라 한 배열에 담으려면 여기서만 느슨하게 받는다.
type AnySheetSpec = SheetSpec<any>;

/** 회원 식별자를 사람 이름 대신 쓰는 짧은 키. 같은 사람인지 대조하는 데는 충분하다. */
function shortId(id: string | null): string {
  return id ? id.slice(0, 8) : "비회원";
}

function isoDay(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function regionLabel(value: string | null | undefined): string {
  if (!value) return "";
  return REGION_LABELS[value as Region] ?? value;
}

/** 한 축으로 세어 많은 순으로 돌려준다. 요약 시트가 전부 이 모양이다. */
function countBy<T>(rows: T[], pick: (row: T) => string): { key: string; count: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = pick(row) || "미입력";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

const COUNT_COLUMNS = [
  { header: "항목", width: 28, value: (r: { key: string }) => r.key },
  { header: "건수", width: 10, value: (r: { count: number }) => r.count },
];

type AdminClient = NonNullable<ReturnType<typeof createAdminSupabaseClient>>;

function sinceIso(days: number): string {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return since.toISOString();
}

/* ---------------------------------------------------------------- */
/* 도메인별 시트                                                      */
/* ---------------------------------------------------------------- */

interface AssessmentSessionRow {
  id: string;
  user_id: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  total_questions: number | null;
  answered_count: number | null;
  current_section: string | null;
}

async function assessmentSheets(client: AdminClient, days: number): Promise<AnySheetSpec[]> {
  const { data } = await client
    .from("assessment_sessions")
    .select("id, user_id, status, started_at, completed_at, total_questions, answered_count, current_section")
    .gte("started_at", sinceIso(days))
    .order("started_at", { ascending: false });

  const rows = (data ?? []) as AssessmentSessionRow[];

  return [
    {
      name: "진단 세션",
      rows,
      columns: [
        { header: "세션ID", width: 38, value: (r: AssessmentSessionRow) => r.id },
        { header: "회원", width: 12, value: (r: AssessmentSessionRow) => shortId(r.user_id) },
        { header: "상태", width: 12, value: (r: AssessmentSessionRow) => r.status },
        { header: "시작일", width: 12, value: (r: AssessmentSessionRow) => isoDay(r.started_at) },
        { header: "완료일", width: 12, value: (r: AssessmentSessionRow) => isoDay(r.completed_at) },
        { header: "답변수", width: 10, value: (r: AssessmentSessionRow) => r.answered_count ?? 0 },
        { header: "전체문항", width: 10, value: (r: AssessmentSessionRow) => r.total_questions ?? 0 },
        {
          header: "진행률(%)",
          width: 12,
          value: (r: AssessmentSessionRow) =>
            r.total_questions ? Math.round(((r.answered_count ?? 0) / r.total_questions) * 100) : 0,
        },
        { header: "이탈지점", width: 16, value: (r: AssessmentSessionRow) => r.current_section ?? "" },
      ],
    },
    {
      name: "요약 - 상태별",
      rows: countBy(rows, (r) => r.status),
      columns: COUNT_COLUMNS,
    },
    {
      // 완료하지 못한 세션이 어느 분류에서 멈췄는지. 문항을 손볼 지점이 여기서 나온다.
      name: "요약 - 이탈지점",
      rows: countBy(
        rows.filter((r) => r.status !== "completed"),
        (r) => r.current_section ?? "",
      ),
      columns: COUNT_COLUMNS,
    },
  ];
}

async function jobSheets(days: number): Promise<AnySheetSpec[]> {
  const report = await getJobInterestReport(days);
  if (report.error) throw new Error(report.error);

  type Row = (typeof report.rows)[number];
  type Summary = (typeof report.byCategory)[number];

  const summaryColumns = [
    { header: "항목", width: 24, value: (r: Summary) => r.key },
    { header: "순방문자", width: 12, value: (r: Summary) => r.uniqueViewers },
    { header: "조회수", width: 10, value: (r: Summary) => r.viewCount },
    { header: "지원클릭", width: 12, value: (r: Summary) => r.applyClickCount },
  ];

  return [
    {
      name: "관심 공고",
      rows: report.rows,
      columns: [
        { header: "공고명", width: 44, value: (r: Row) => r.title },
        { header: "회사", width: 24, value: (r: Row) => r.companyName },
        { header: "직종", width: 18, value: (r: Row) => r.jobCategory },
        { header: "지역", width: 10, value: (r: Row) => r.region },
        { header: "급여", width: 18, value: (r: Row) => r.salaryText },
        { header: "순방문자", width: 12, value: (r: Row) => r.uniqueViewers },
        { header: "조회수", width: 10, value: (r: Row) => r.viewCount },
        { header: "1인당조회", width: 12, value: (r: Row) => r.viewsPerViewer },
        { header: "북마크", width: 10, value: (r: Row) => r.bookmarkCount },
        { header: "지원클릭", width: 12, value: (r: Row) => r.applyClickCount },
        { header: "지원전환율(%)", width: 15, value: (r: Row) => r.applyRatePercent },
        { header: "게시중", width: 10, value: (r: Row) => (r.isActive ? "Y" : "N") },
      ],
    },
    { name: "요약 - 직종별", rows: report.byCategory, columns: summaryColumns },
    { name: "요약 - 지역별", rows: report.byRegion, columns: summaryColumns },
  ];
}

interface SupportSessionRow {
  id: string;
  user_id: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  answers: Record<string, unknown> | null;
}

function answerText(answers: Record<string, unknown> | null, key: string): string {
  const value = answers?.[key];
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "예" : "아니오";
  return String(value);
}

async function supportSheets(client: AdminClient, days: number): Promise<AnySheetSpec[]> {
  const { data } = await client
    .from("support_assessment_sessions")
    .select("id, user_id, status, started_at, completed_at, answers")
    .gte("started_at", sinceIso(days))
    .order("started_at", { ascending: false });

  const rows = (data ?? []) as SupportSessionRow[];

  return [
    {
      name: "지원금 진단",
      rows,
      columns: [
        { header: "세션ID", width: 38, value: (r: SupportSessionRow) => r.id },
        { header: "회원", width: 12, value: (r: SupportSessionRow) => shortId(r.user_id) },
        { header: "상태", width: 12, value: (r: SupportSessionRow) => r.status },
        { header: "시작일", width: 12, value: (r: SupportSessionRow) => isoDay(r.started_at) },
        { header: "완료일", width: 12, value: (r: SupportSessionRow) => isoDay(r.completed_at) },
        { header: "출생연도", width: 10, value: (r: SupportSessionRow) => answerText(r.answers, "birthYear") },
        {
          header: "지역",
          width: 10,
          value: (r: SupportSessionRow) => regionLabel(answerText(r.answers, "region")),
        },
        { header: "취업상태", width: 16, value: (r: SupportSessionRow) => answerText(r.answers, "employmentStatus") },
        { header: "소득수준", width: 12, value: (r: SupportSessionRow) => answerText(r.answers, "incomeBand") },
        { header: "가구특성", width: 28, value: (r: SupportSessionRow) => answerText(r.answers, "householdTraits") },
        { header: "훈련의향", width: 10, value: (r: SupportSessionRow) => answerText(r.answers, "trainingWillingness") },
      ],
    },
    {
      name: "요약 - 지역별",
      rows: countBy(rows, (r) => regionLabel(answerText(r.answers, "region"))),
      columns: COUNT_COLUMNS,
    },
    {
      name: "요약 - 취업상태별",
      rows: countBy(rows, (r) => answerText(r.answers, "employmentStatus")),
      columns: COUNT_COLUMNS,
    },
  ];
}

interface ResumeRow {
  id: string;
  user_id: string | null;
  document_type: string | null;
  status: string | null;
  review_status: string | null;
  completeness: number | null;
  template_id: string | null;
  desired_job_title: string | null;
  desired_region: string | null;
  created_at: string | null;
  updated_at: string | null;
}

async function resumeSheets(client: AdminClient, days: number): Promise<AnySheetSpec[]> {
  const { data } = await client
    .from("resumes")
    .select(
      "id, user_id, document_type, status, review_status, completeness, template_id, desired_job_title, desired_region, created_at, updated_at",
    )
    .gte("created_at", sinceIso(days))
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as ResumeRow[];

  return [
    {
      name: "이력서",
      rows,
      columns: [
        { header: "이력서ID", width: 38, value: (r: ResumeRow) => r.id },
        { header: "회원", width: 12, value: (r: ResumeRow) => shortId(r.user_id) },
        { header: "종류", width: 14, value: (r: ResumeRow) => r.document_type ?? "" },
        { header: "상태", width: 12, value: (r: ResumeRow) => r.status ?? "" },
        { header: "첨삭상태", width: 14, value: (r: ResumeRow) => r.review_status ?? "" },
        { header: "완성도(%)", width: 12, value: (r: ResumeRow) => r.completeness ?? 0 },
        { header: "템플릿", width: 18, value: (r: ResumeRow) => r.template_id ?? "" },
        { header: "희망직무", width: 24, value: (r: ResumeRow) => r.desired_job_title ?? "" },
        { header: "희망지역", width: 12, value: (r: ResumeRow) => regionLabel(r.desired_region) },
        { header: "작성일", width: 12, value: (r: ResumeRow) => isoDay(r.created_at) },
        { header: "수정일", width: 12, value: (r: ResumeRow) => isoDay(r.updated_at) },
      ],
    },
    {
      name: "요약 - 첨삭상태별",
      rows: countBy(rows, (r) => r.review_status ?? ""),
      columns: COUNT_COLUMNS,
    },
    {
      name: "요약 - 템플릿별",
      rows: countBy(rows, (r) => r.template_id ?? ""),
      columns: COUNT_COLUMNS,
    },
  ];
}

/** 영업 리드. 진단 데이터를 영업 관점으로 합친 행이라 기간 필터 없이 전체를 담는다. */
async function leadSheets(): Promise<AnySheetSpec[]> {
  const rows = await getSalesLeads();

  return [
    {
      name: "영업 리드",
      rows,
      columns: [
        { header: "이름", width: 12, value: (r: SalesLeadRow) => r.name },
        { header: "연락처", width: 16, value: (r: SalesLeadRow) => r.phone ?? "" },
        { header: "연령대", width: 10, value: (r: SalesLeadRow) => r.ageLabel ?? "" },
        { header: "지역", width: 10, value: (r: SalesLeadRow) => r.regionLabel ?? "" },
        { header: "취업상태", width: 14, value: (r: SalesLeadRow) => r.employmentLabel ?? "" },
        { header: "추천 직업", width: 26, value: (r: SalesLeadRow) => r.topOccupation ?? "" },
        { header: "제안 과정", width: 26, value: (r: SalesLeadRow) => r.proposedCourse ?? "" },
        { header: "고용보험", width: 10, value: (r: SalesLeadRow) => (r.insurance ? labelInsurance(r.insurance) : "") },
        { header: "소득", width: 10, value: (r: SalesLeadRow) => (r.incomeBand ? labelIncomeBand(r.incomeBand) : "") },
        {
          header: "훈련의향",
          width: 10,
          value: (r: SalesLeadRow) => (r.trainingWillingness != null ? `${r.trainingWillingness}점` : ""),
        },
        { header: "영업 태그", width: 44, value: (r: SalesLeadRow) => r.tags.join(", ") },
        { header: "마케팅 동의", width: 12, value: (r: SalesLeadRow) => (r.marketingConsent ? "Y" : "N") },
        { header: "가입일", width: 12, value: (r: SalesLeadRow) => r.joinedAt },
      ],
    },
    {
      name: "요약 - 태그별",
      rows: countBy(
        rows.flatMap((r) => (r.tags.length ? r.tags.map((tag) => ({ tag })) : [{ tag: "태그 없음" }])),
        (r) => r.tag,
      ),
      columns: COUNT_COLUMNS,
    },
    {
      name: "요약 - 추천직업별",
      // "직업명 (72점)" 에서 점수를 떼고 직업명으로 센다.
      rows: countBy(rows, (r) => (r.topOccupation ? r.topOccupation.replace(/\s*\(\d+점\)$/, "") : "진단 전")),
      columns: COUNT_COLUMNS,
    },
    {
      name: "요약 - 제안과정별",
      rows: countBy(
        rows.filter((r) => r.proposedCourse),
        (r) => r.proposedCourse ?? "",
      ),
      columns: COUNT_COLUMNS,
    },
  ];
}

export async function buildExportSheets(domain: ExportDomain, days: number): Promise<AnySheetSpec[]> {
  if (domain === "jobs") return jobSheets(days);
  if (domain === "leads") return leadSheets();

  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase 관리자 키가 설정되지 않았습니다.");

  if (domain === "assessment") return assessmentSheets(client, days);
  if (domain === "support") return supportSheets(client, days);
  return resumeSheets(client, days);
}
