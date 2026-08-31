import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Download } from "lucide-react";
import { getAdminStatsTrend } from "@/services/admin-stats.service";
import { getMemberComposition } from "@/services/member-composition.service";
import { getAssessmentStats } from "@/services/assessment-stats.service";
import { getJobStats, getResumeStats, getSupportStats } from "@/services/service-stats.service";
import { EXPORT_DOMAINS, EXPORT_LABELS } from "@/services/admin-export.service";
import { TrendChart } from "@/features/admin/stats-charts";
import { MemberCompositionView } from "@/features/admin/member-composition-view";
import { AssessmentStatsView } from "@/features/admin/assessment-stats-view";
import { JobStatsView } from "@/features/admin/job-stats-view";
import { ResumeStatsView, SupportStatsView } from "@/features/admin/support-resume-stats-view";
import { CardHead, StatsCard } from "@/features/admin/stats-primitives";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "통계 | 관리자",
};

/** 화면에서 고를 수 있는 기간. 짧게 보면 어제 일이, 길게 보면 추세가 보인다. */
const PERIODS = [7, 30, 90] as const;
const DEFAULT_PERIOD = 30;

/**
 * 탭.
 *
 * "회원 구성"이 통합 개요다 - 이용 추이와 회원 분포를 여기서 한 번에 본 뒤,
 * 걸리는 게 있으면 해당 서비스 탭으로 내려간다. 나머지 탭은 서비스를 하나씩 맡는다.
 *
 * 탭을 주소에 두면 그 탭에 필요한 집계만 조회하게 되고(느린 쿼리를 안 도는 이득),
 * 새로고침하거나 링크를 넘겨도 보던 화면이 그대로 열린다.
 */
const TABS = [
  { key: "members", label: "회원 구성", subtitle: "전체를 한눈에 - 이용 추이와 회원 분포" },
  { key: "assessment", label: "직업진단", subtitle: "진단을 끝까지 하는지, 어떤 직업이 나오는지" },
  { key: "jobs", label: "채용공고", subtitle: "사람들이 유심히 본 공고가 무엇인지" },
  { key: "support", label: "지원금", subtitle: "진단을 끝까지 하는지, 어떤 조건의 사람이 오는지" },
  { key: "resume", label: "이력서", subtitle: "쓰다 마는지, 첨삭까지 가는지" },
  { key: "export", label: "엑셀 받기", subtitle: "목록 시트와 요약 시트를 한 파일로" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function parsePeriod(raw: string | undefined): number {
  const parsed = Number(raw);
  return (PERIODS as readonly number[]).includes(parsed) ? parsed : DEFAULT_PERIOD;
}

function parseTab(raw: string | undefined): TabKey {
  const found = TABS.find((t) => t.key === raw);
  return found ? found.key : "members";
}

/**
 * 집계를 못 불러왔을 때. 빈 차트를 그리면 "이용이 0이었다"로 읽혀서
 * 데이터가 없는 것과 못 불러온 것이 구분되지 않는다.
 */
function LoadError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-label-1 text-amber-700">
      <AlertTriangle className="size-4 shrink-0" />
      집계를 불러오지 못했습니다 — {message}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* 탭별 내용                                                          */
/* ---------------------------------------------------------------- */

/** 통합 개요. 추이 → 분포 → 퍼널 순으로, 넓게 보다가 좁혀 들어가는 순서다. */
async function MembersTab({ days }: { days: number }) {
  const [trend, composition] = await Promise.all([
    getAdminStatsTrend(days),
    getMemberComposition(days),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <StatsCard>
        <CardHead title="서비스별 이용 추이" meta={`최근 ${days}일`} />
        <div className="mt-3">
          {trend.error ? <LoadError message={trend.error} /> : <TrendChart rows={trend.rows} />}
        </div>
      </StatsCard>

      {composition.error && composition.kpis.length === 0 ? (
        <LoadError message={composition.error} />
      ) : (
        <MemberCompositionView data={composition} days={days} />
      )}
    </div>
  );
}

async function AssessmentTab({ days }: { days: number }) {
  const data = await getAssessmentStats(days);
  if (data.error) return <LoadError message={data.error} />;
  return <AssessmentStatsView data={data} days={days} />;
}

async function JobsTab() {
  const data = await getJobStats();
  if (data.error) return <LoadError message={data.error} />;
  return <JobStatsView data={data} />;
}

async function SupportTab({ days }: { days: number }) {
  const data = await getSupportStats(days);
  if (data.error) return <LoadError message={data.error} />;
  return <SupportStatsView data={data} days={days} />;
}

async function ResumeTab({ days }: { days: number }) {
  const data = await getResumeStats(days);
  if (data.error) return <LoadError message={data.error} />;
  return <ResumeStatsView data={data} days={days} />;
}

function ExportTab({ days }: { days: number }) {
  return (
    <div className="space-y-3">
      <p className="text-label-1 text-slate-500">
        선택한 기간(최근 {days}일) 기준입니다. 도메인마다 목록 시트 한 장과 요약 시트가 담깁니다. 영업리드는 기간과
        무관하게 전체 회원 기준입니다.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {EXPORT_DOMAINS.map((domain) => (
          <a
            key={domain}
            href={`/api/admin/export/${domain}?days=${days}`}
            className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-label-1 font-medium text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-brand-blue-50 hover:text-brand-blue-700"
          >
            {EXPORT_LABELS[domain]}
            <Download className="size-4" />
          </a>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; tab?: string }>;
}) {
  const { period, tab } = await searchParams;
  const days = parsePeriod(period);
  const active = parseTab(tab);
  const activeTab = TABS.find((t) => t.key === active)!;
  // 채용공고는 공고가 며칠이면 마감돼 항상 최근 7일만 본다. 기간 선택이 안 먹으므로 아예 감춘다.
  const periodApplies = active !== "jobs";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title-3 font-bold text-slate-900">통계</h1>
          <p className="mt-1 text-label-1 text-slate-500">{activeTab.subtitle}</p>
        </div>
        {periodApplies && (
          // 기간을 바꿔도 보던 탭에 머문다.
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/admin/stats?tab=${active}&period=${p}`}
                className={cn(
                  "rounded-md px-3 py-1.5 text-label-2 font-medium transition-colors",
                  p === days ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                )}
              >
                {p}일
              </Link>
            ))}
          </div>
        )}
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/stats?tab=${t.key}&period=${days}`}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-label-1 font-medium transition-colors",
              t.key === active
                ? "border-brand-blue-500 text-brand-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="pt-2">
        {active === "members" && <MembersTab days={days} />}
        {active === "assessment" && <AssessmentTab days={days} />}
        {active === "jobs" && <JobsTab />}
        {active === "support" && <SupportTab days={days} />}
        {active === "resume" && <ResumeTab days={days} />}
        {active === "export" && <ExportTab days={days} />}
      </div>
    </div>
  );
}

// 집계 결과라 캐시되면 어제 숫자를 보게 된다.
export const dynamic = "force-dynamic";
