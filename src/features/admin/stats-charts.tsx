"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TREND_METRICS, type DailyTrendRow } from "@/services/admin-stats.service";

/**
 * 일자별 이용 추이. 통계 페이지에서 유일하게 recharts를 쓰는 그림이다.
 * 여러 계열이 겹치는 선그래프라 축·범례·툴팁이 필요해 라이브러리가 값을 한다.
 *
 * 나머지 막대·순위는 stats-primitives.tsx에서 div 폭으로 그린다 - 그쪽은 서버 렌더다.
 * recharts는 브라우저에서만 동작하므로 이 파일만 클라이언트다.
 */

const LINE_COLORS = ["#2563eb", "#16a34a", "#ea580c", "#7c3aed"];

const AXIS_STYLE = { fontSize: 12, fill: "#64748b" };

const TOOLTIP_STYLE = {
  contentStyle: { borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 },
} as const;

/** "2026-08-28" → "8/28". 가로축에 연도까지 넣으면 라벨이 겹친다. */
function shortDay(day: string): string {
  const [, month, date] = day.split("-");
  return `${Number(month)}/${Number(date)}`;
}

export function TrendChart({ rows }: { rows: DailyTrendRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="day" tickFormatter={shortDay} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
        {/* 축은 8/28로 줄이지만 툴팁은 연도까지 그대로 보여준다. */}
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {TREND_METRICS.map((metric, i) => (
          <Line
            key={metric.key}
            type="monotone"
            dataKey={metric.key}
            name={metric.label}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
