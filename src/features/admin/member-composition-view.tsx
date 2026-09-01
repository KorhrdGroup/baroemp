import { cn } from "@/lib/utils";
import type { Kpi, MemberComposition, RankRow, Slice } from "@/services/member-composition.service";

/**
 * 통계 > 회원 구성 화면.
 *
 * 차트를 라이브러리로 그리지 않는다. 도넛은 conic-gradient, 막대는 div 폭이면 충분하고
 * 이 정도 그림에 recharts를 부르면 클라이언트 번들만 커진다. 덕분에 전부 서버에서 렌더된다.
 *
 * 색은 진할수록 큰 값이다. 순서를 색으로도 읽을 수 있어야 표를 훑지 않고 넘어갈 수 있다.
 */

const SCALE = ["#1d4ed8", "#3b82f6", "#93b4f0", "#c7d7f6", "#e6ebf3"];

function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-xl bg-white p-5 ring-1 ring-slate-200", className)}>{children}</div>;
}

function CardHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h3 className="text-label-1 font-bold text-slate-900">{title}</h3>
      {meta && <span className="text-label-2 text-slate-400">{meta}</span>}
    </div>
  );
}

/** 값 하나짜리 가로 막대. 폭을 %로만 주면 되므로 따로 라이브러리가 필요 없다. */
function Bar({ pct, color, className }: { pct: number; color: string; className?: string }) {
  return (
    <span className={cn("block h-2 overflow-hidden rounded-full bg-slate-100", className)}>
      <span
        className="block h-full rounded-full"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
      />
    </span>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const captionColor =
    kpi.captionTone === "ok"
      ? "text-emerald-600"
      : kpi.captionTone === "warn"
        ? "text-amber-700"
        : "text-slate-500";

  return (
    <Card className="px-4 py-3.5">
      <p className="text-label-2 text-slate-500">{kpi.label}</p>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-title-3 font-bold tracking-tight text-slate-900">{kpi.value}</span>
        {kpi.unit && <span className="text-label-2 text-slate-500">{kpi.unit}</span>}
      </p>

      {kpi.spark && (
        // 스파크라인. 최근 이틀만 진하게 칠해 "지금"이 어디인지 보이게 한다.
        <div className="mt-2.5 flex h-5 items-end gap-[3px]">
          {kpi.spark.map((v, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-[2px]",
                i >= kpi.spark!.length - 2 ? "bg-brand-blue-500" : "bg-slate-200",
              )}
              style={{ height: `${Math.max(8, v * 100)}%` }}
            />
          ))}
        </div>
      )}

      {typeof kpi.ratio === "number" && !kpi.spark && (
        <div className="mt-4">
          <Bar pct={kpi.ratio * 100} color={kpi.ratioTone === "warn" ? "#f59e0b" : "#2563eb"} />
        </div>
      )}

      {kpi.caption && <p className={cn("mt-2 text-label-2", captionColor)}>{kpi.caption}</p>}
    </Card>
  );
}

/** 도넛. 몫이 몇 조각으로 갈렸는지 한눈에 보는 용도라 조각 수가 적을 때만 쓴다. */
function DonutBreakdown({
  title,
  meta,
  slices,
  centerValue,
  centerLabel,
}: {
  title: string;
  meta?: string;
  slices: Slice[];
  centerValue: string;
  centerLabel: string;
}) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  let acc = 0;
  const stops = slices
    .map((d, i) => {
      const from = percent(acc, total);
      acc += d.value;
      return `${SCALE[i % SCALE.length]} ${from}% ${percent(acc, total)}%`;
    })
    .join(",");

  return (
    <Card>
      <CardHead title={title} meta={meta} />
      <div className="mt-4 flex items-center gap-6">
        <div
          className="relative size-32 shrink-0 rounded-full"
          style={{ background: total > 0 ? `conic-gradient(${stops})` : "#f1f5f9" }}
        >
          <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white">
            <span className="text-body-1 font-bold leading-none text-slate-900">{centerValue}</span>
            <span className="mt-1 text-label-2 text-slate-500">{centerLabel}</span>
          </div>
        </div>
        <ul className="flex flex-1 flex-col gap-2">
          {slices.map((d, i) => (
            <li key={d.label} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ background: SCALE[i % SCALE.length] }}
              />
              <span className={cn("flex-1 text-label-1", d.muted ? "text-slate-400" : "text-slate-600")}>
                {d.label}
              </span>
              <span className={cn("text-label-1 font-bold", d.muted ? "text-slate-400" : "text-slate-900")}>
                {d.value}명
              </span>
              <span className="w-10 text-right text-label-2 text-slate-400">{percent(d.value, total)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/** 누적 막대. 조각을 비율 그대로 이어 붙여 "전체 중 얼마"를 폭으로 보여준다. */
function StackedBreakdown({ title, meta, slices }: { title: string; meta?: string; slices: Slice[] }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  return (
    <Card>
      <CardHead title={title} meta={meta} />
      <div className="mt-5 flex h-11 overflow-hidden rounded-lg bg-slate-100">
        {slices.map((d, i) => {
          const p = percent(d.value, total);
          return (
            <div
              key={d.label}
              title={`${d.label} ${d.value}명 (${p}%)`}
              className={cn(
                "flex items-center justify-center text-label-1 font-bold",
                i < 2 ? "text-white" : "text-brand-blue-900",
              )}
              style={{ width: `${p}%`, background: SCALE[i % SCALE.length] }}
            >
              {/* 조각이 좁으면 숫자가 잘려 오히려 안 읽힌다. */}
              {!d.muted && p >= 12 ? `${p}%` : ""}
            </div>
          );
        })}
      </div>
      <ul className="mt-3">
        {slices.map((d, i) => (
          <li
            key={d.label}
            className={cn(
              "flex items-center gap-2 py-2",
              i !== slices.length - 1 && "border-b border-slate-100",
            )}
          >
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: SCALE[i % SCALE.length] }} />
            <span className={cn("flex-1 text-label-1", d.muted ? "text-slate-400" : "text-slate-600")}>
              {d.label}
            </span>
            <span className={cn("text-label-1 font-bold", d.muted ? "text-slate-400" : "text-slate-900")}>
              {d.value}명
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RegionRanking({
  title,
  meta,
  rows,
  rest,
}: {
  title: string;
  meta?: string;
  rows: RankRow[];
  rest: { label: string; value: number };
}) {
  const total = rows.reduce((s, r) => s + r.value, 0) + rest.value;
  return (
    <Card>
      <CardHead title={title} meta={meta} />
      {rows.length === 0 ? (
        <p className="py-10 text-center text-label-1 text-slate-400">데이터가 없습니다.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {rows.map((r, i) => (
            <div key={r.label}>
              <div className="mb-1.5 flex justify-between text-label-1 text-slate-600">
                <span className={cn(i === 0 && "font-bold")}>{r.label}</span>
                <span>
                  <b className="text-slate-900">{r.value}</b>
                  <span className="text-slate-400"> · {percent(r.value, total)}%</span>
                </span>
              </div>
              <Bar pct={percent(r.value, total)} color={SCALE[Math.min(i, 2)]} />
            </div>
          ))}
          {/* 꼬리를 다 늘어놓으면 상위 쏠림이 안 보인다. 한 줄로 접되 숨기지는 않는다.
              접을 게 없으면 "그 외 0개"라는 빈 줄만 남으므로 아예 그리지 않는다. */}
          {rest.value > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-label-2 text-slate-400">{rest.label}</span>
              <span className="h-px flex-1 bg-slate-100" />
              <span className="text-label-2 text-slate-400">{rest.value}건</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function JobRanking({ title, meta, rows }: { title: string; meta?: string; rows: RankRow[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <Card>
      <CardHead title={title} meta={meta} />
      {rows.length === 0 ? (
        <p className="py-10 text-center text-label-1 text-slate-400">데이터가 없습니다.</p>
      ) : (
        <ul className="mt-2">
          {rows.map((r, i) => (
            <li
              key={r.label}
              className={cn(
                "flex items-center gap-3 py-2",
                i !== rows.length - 1 && "border-b border-slate-100",
              )}
            >
              <span
                className={cn(
                  "w-5 text-label-2 font-bold",
                  i === 0 ? "text-brand-blue-600" : "text-slate-400",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                title={r.label}
                className={cn(
                  "min-w-0 flex-1 truncate text-label-1",
                  i === 0 ? "font-medium text-slate-900" : "text-slate-600",
                )}
              >
                {r.label}
              </span>
              <Bar
                pct={(r.value / max) * 100}
                color={i === 0 ? "#1d4ed8" : "#93b4f0"}
                className="w-[90px] shrink-0"
              />
              <span className="w-6 text-right text-label-1 font-bold text-slate-900">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** 요약. 숫자를 읽을 줄 아는 사람만 쓰는 화면이 아니라서, 눈에 띄는 쏠림은 문장으로 먼저 말한다. */
function InsightPanel({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <Card className="flex gap-5">
      <div className="flex shrink-0 flex-col justify-center gap-1 border-r border-slate-100 pr-5">
        <span className="text-label-2 font-bold tracking-wider text-brand-blue-600">요약</span>
        <span className="text-label-2 text-slate-400">자동 생성</span>
      </div>
      <ul className="flex flex-1 flex-col gap-2.5">
        {lines.map((line) => (
          <li key={line} className="flex items-baseline gap-2.5">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-blue-500" />
            <p className="text-body-2-reading text-slate-700">{line}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function MemberCompositionView({ data, days }: { data: MemberComposition; days: number }) {
  const ageTotal = data.ageGroups.reduce((s, a) => s + a.value, 0);
  const seniorShare = percent(
    data.ageGroups
      .filter((a) => a.label.startsWith("50") || a.label.startsWith("60") || a.label.startsWith("70"))
      .reduce((s, a) => s + a.value, 0),
    ageTotal,
  );
  const supportTotal = data.supportRegions.reduce((s, r) => s + r.value, 0) + data.supportRegionsRest.value;
  const jobViews = data.topJobs.reduce((s, j) => s + j.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <InsightPanel lines={data.insights} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DonutBreakdown
          title="연령대별 회원"
          meta={`n=${ageTotal}`}
          slices={data.ageGroups}
          centerValue={`${seniorShare}%`}
          centerLabel="50대 이상"
        />
        <StackedBreakdown title="취업상태별 회원" meta={`n=${ageTotal}`} slices={data.employmentStatus} />
        <RegionRanking
          title="지원금 진단 지역"
          meta={`최근 ${days}일 · 총 ${supportTotal}건`}
          rows={data.supportRegions}
          rest={data.supportRegionsRest}
        />
        <JobRanking
          title={`많이 본 직종 TOP ${data.topJobs.length}`}
          meta={`순방문자 ${jobViews}명`}
          rows={data.topJobs}
        />
      </div>
    </div>
  );
}
