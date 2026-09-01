import { cn } from "@/lib/utils";

/**
 * 통계 탭들이 함께 쓰는 조각.
 *
 * 차트를 라이브러리로 그리지 않는다. 막대는 div 폭이면 충분하고, 그래서 전부 서버에서 렌더된다.
 * 색은 진할수록 큰 값이다 - 순서를 색으로도 읽을 수 있어야 표를 훑지 않고 넘어갈 수 있다.
 */

export const SCALE = ["#1d4ed8", "#3b82f6", "#93b4f0", "#c7d7f6", "#e6ebf3"];

export function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function StatsCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-xl bg-white p-5 ring-1 ring-slate-200", className)}>{children}</div>;
}

export function CardHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-label-1 font-bold text-slate-900">{title}</h3>
      {meta && <span className="shrink-0 text-label-2 text-slate-400">{meta}</span>}
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  caption,
}: {
  label: string;
  value: string;
  unit?: string;
  caption?: string;
}) {
  return (
    <StatsCard className="px-4 py-3.5">
      <p className="text-label-2 text-slate-500">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-title-3 font-bold tracking-tight text-slate-900">{value}</span>
        {unit && <span className="text-label-2 text-slate-500">{unit}</span>}
      </p>
      {caption && <p className="mt-2 text-label-2 text-slate-500">{caption}</p>}
    </StatsCard>
  );
}

export function Bar({ pct, color, className }: { pct: number; color: string; className?: string }) {
  return (
    <span className={cn("block h-2 overflow-hidden rounded-full bg-slate-100", className)}>
      <span
        className="block h-full rounded-full"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
      />
    </span>
  );
}

export function EmptyLine({ text = "데이터가 없습니다." }: { text?: string }) {
  return <p className="py-10 text-center text-label-1 text-slate-400">{text}</p>;
}

/** 한 축의 분포. 지역·상태·템플릿처럼 "무엇이 몇 건"이면 전부 이 모양이다. */
export function CountBreakdown({
  title,
  meta,
  rows,
  unit = "건",
}: {
  title: string;
  meta?: string;
  rows: { label: string; count: number }[];
  unit?: string;
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <StatsCard>
      <CardHead title={title} meta={meta ?? `총 ${total}${unit}`} />
      {rows.length === 0 ? (
        <EmptyLine />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {rows.map((row, i) => (
            <div key={row.label}>
              <div className="mb-1.5 flex justify-between text-label-1 text-slate-600">
                <span className={cn(i === 0 && "font-bold")}>{row.label}</span>
                <span>
                  <b className="text-slate-900">{row.count}</b>
                  <span className="text-slate-400"> · {percent(row.count, total)}%</span>
                </span>
              </div>
              <Bar pct={(row.count / max) * 100} color={SCALE[Math.min(i, SCALE.length - 1)]} />
            </div>
          ))}
        </div>
      )}
    </StatsCard>
  );
}
