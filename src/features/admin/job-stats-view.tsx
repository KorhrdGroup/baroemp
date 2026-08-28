import { cn } from "@/lib/utils";
import {
  Bar,
  CardHead,
  CountBreakdown,
  EmptyLine,
  Stat,
  StatsCard,
} from "./stats-primitives";
import type { JobStats } from "@/services/service-stats.service";

/**
 * 통계 > 채용공고 화면.
 *
 * 공고는 며칠이면 마감돼 사라진다. 그래서 이 탭은 기간 선택을 따르지 않고 항상 최근 7일만 본다 -
 * 90일치를 섞으면 이미 지원할 수 없는 공고가 순위 위를 차지한다.
 */

function JobRanking({ rows, windowDays, viewedCount }: {
  rows: JobStats["topJobs"];
  windowDays: number;
  viewedCount: number;
}) {
  const max = Math.max(...rows.map((r) => r.uniqueViewers), 1);

  return (
    <StatsCard className="xl:col-span-2">
      <CardHead
        title={`많이 본 공고 TOP ${rows.length}`}
        meta={`최근 ${windowDays}일 · 조회된 공고 ${viewedCount}건 중`}
      />
      {rows.length === 0 ? (
        <EmptyLine text="이 기간에 열린 공고가 없습니다." />
      ) : (
        <>
          <div className="mt-3 hidden items-center gap-3 px-1 pb-1.5 text-label-2 text-slate-400 sm:flex">
            <span className="w-5" />
            <span className="flex-1">공고</span>
            <span className="w-16 text-right">순방문자</span>
            <span className="w-14 text-right">조회수</span>
            <span className="w-16 text-right">1인당</span>
            <span className="w-14 text-right">지원</span>
            <span className="w-[90px]" />
          </div>
          <ul>
            {rows.map((row, i) => (
              <li
                key={row.jobId}
                className={cn(
                  "flex flex-wrap items-center gap-3 py-2",
                  i !== rows.length - 1 && "border-b border-slate-100",
                )}
              >
                <span
                  className={cn(
                    "w-5 shrink-0 text-label-2 font-bold",
                    i === 0 ? "text-brand-blue-600" : "text-slate-400",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    title={row.title}
                    className={cn(
                      "block truncate text-label-1",
                      i === 0 ? "font-medium text-slate-900" : "text-slate-700",
                    )}
                  >
                    {row.title}
                    {/* 마감된 공고가 위에 올라오면 왜 지원이 안 붙었는지가 설명된다. */}
                    {!row.isActive && (
                      <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-label-2 text-slate-500">
                        마감
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-label-2 text-slate-400">
                    {row.companyName} · {row.jobCategory || "직종 미분류"} · {row.region || "지역 미상"}
                  </span>
                </span>
                <span className="w-16 shrink-0 text-right text-label-1 font-bold text-slate-900">
                  {row.uniqueViewers}
                </span>
                <span className="w-14 shrink-0 text-right text-label-1 text-slate-500">{row.viewCount}</span>
                {/* 1인당 조회가 1을 크게 넘으면 다시 열어본 공고 - "유심히 본"에 가장 가까운 값이다. */}
                <span
                  className={cn(
                    "w-16 shrink-0 text-right text-label-1",
                    row.viewsPerViewer >= 2 ? "font-bold text-brand-blue-600" : "text-slate-500",
                  )}
                >
                  {row.viewsPerViewer}회
                </span>
                <span
                  className={cn(
                    "w-14 shrink-0 text-right text-label-1",
                    row.applyClickCount > 0 ? "font-bold text-emerald-600" : "text-slate-300",
                  )}
                >
                  {row.applyClickCount}
                </span>
                <Bar
                  pct={(row.uniqueViewers / max) * 100}
                  color={i === 0 ? "#1d4ed8" : "#93b4f0"}
                  className="w-[90px] shrink-0"
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </StatsCard>
  );
}

export function JobStatsView({ data }: { data: JobStats }) {
  const applyRate =
    data.totalUniqueViewers > 0
      ? Math.round((data.totalApplyClicks / data.totalUniqueViewers) * 1000) / 10
      : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="조회된 공고"
          value={String(data.viewedJobCount)}
          unit="건"
          caption={`최근 ${data.windowDays}일 · 상세를 연 공고만`}
        />
        <Stat label="순방문자" value={String(data.totalUniqueViewers)} unit="명" caption="같은 사람은 한 번만" />
        <Stat label="총 조회" value={String(data.totalViews)} unit="회" />
        <Stat
          label="지원 클릭"
          value={String(data.totalApplyClicks)}
          unit="건"
          caption={`순방문자 대비 ${applyRate}%`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <JobRanking rows={data.topJobs} windowDays={data.windowDays} viewedCount={data.viewedJobCount} />
        <CountBreakdown
          title="많이 본 직종"
          meta={`최근 ${data.windowDays}일`}
          rows={data.byCategory.map((r) => ({ label: r.key, count: r.uniqueViewers }))}
          unit="명"
        />
        <CountBreakdown
          title="많이 본 지역"
          meta={`최근 ${data.windowDays}일`}
          rows={data.byRegion.map((r) => ({ label: r.key, count: r.uniqueViewers }))}
          unit="명"
        />
      </div>
    </div>
  );
}
