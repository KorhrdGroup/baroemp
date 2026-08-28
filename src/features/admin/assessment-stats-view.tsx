import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssessmentStats, QuestionDropoffRow } from "@/services/assessment-stats.service";

/**
 * 통계 > 직업진단 화면.
 *
 * 회원 구성 탭과 같은 방식으로 그린다 - 막대는 div 폭이면 충분하고,
 * 라이브러리를 부르지 않으므로 전부 서버에서 렌더된다.
 */

const SCALE = ["#1d4ed8", "#3b82f6", "#93b4f0", "#c7d7f6", "#e6ebf3"];

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

function Stat({ label, value, unit, caption }: { label: string; value: string; unit?: string; caption?: string }) {
  return (
    <Card className="px-4 py-3.5">
      <p className="text-label-2 text-slate-500">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-title-3 font-bold tracking-tight text-slate-900">{value}</span>
        {unit && <span className="text-label-2 text-slate-500">{unit}</span>}
      </p>
      {caption && <p className="mt-2 text-label-2 text-slate-500">{caption}</p>}
    </Card>
  );
}

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

/** 어느 분류에서 멈췄나. 완료 세션은 마지막 분류에 머물러 있어 이탈에서 뺀다. */
function SectionDropoff({ rows }: { rows: AssessmentStats["sectionProgress"] }) {
  const max = Math.max(...rows.map((r) => r.droppedCount), 1);
  const total = rows.reduce((s, r) => s + r.droppedCount, 0);

  return (
    <Card>
      <CardHead title="어느 분류에서 멈췄나" meta={`미완료 ${total}건`} />
      {total === 0 ? (
        <p className="py-10 text-center text-label-1 text-slate-400">미완료 세션이 없습니다.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {rows.map((row, i) => (
            <div key={row.label}>
              <div className="mb-1.5 flex justify-between text-label-1 text-slate-600">
                <span>{row.label}</span>
                <span className="font-bold text-slate-900">{row.droppedCount}건</span>
              </div>
              <Bar pct={(row.droppedCount / max) * 100} color={SCALE[Math.min(i, SCALE.length - 1)]} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function RecommendationRanking({ rows }: { rows: AssessmentStats["recommendations"] }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  const total = rows.reduce((s, r) => s + r.count, 0);

  return (
    <Card>
      <CardHead title="1순위로 추천된 직업" meta={`완료 ${total}건`} />
      {rows.length === 0 ? (
        <p className="py-10 text-center text-label-1 text-slate-400">데이터가 없습니다.</p>
      ) : (
        <ul className="mt-2">
          {rows.map((row, i) => (
            <li
              key={row.occupationName}
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
                className={cn(
                  "min-w-0 flex-1 truncate text-label-1",
                  i === 0 ? "font-medium text-slate-900" : "text-slate-600",
                )}
              >
                {row.occupationName}
                {/* 이 직업을 받은 사람들이 어느 연령대인지가 콘텐츠를 고를 근거가 된다. */}
                {row.topAgeGroup && <span className="ml-1.5 text-label-2 text-slate-400">{row.topAgeGroup}</span>}
              </span>
              <span className="w-12 shrink-0 text-right text-label-2 text-slate-400">{row.avgScore}점</span>
              <Bar
                pct={(row.count / max) * 100}
                color={i === 0 ? "#1d4ed8" : "#93b4f0"}
                className="w-[70px] shrink-0"
              />
              <span className="w-6 text-right text-label-1 font-bold text-slate-900">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * 문항별 남은 사람. 바로 앞 문항 대비 몇 %가 남았는지를 본다.
 * 누적 응답 수만 보면 뒤로 갈수록 줄어드는 게 당연해 보여서 어느 문항이 문제인지 안 드러난다.
 */
function QuestionDropoff({ rows, worst }: { rows: QuestionDropoffRow[]; worst: QuestionDropoffRow | null }) {
  const first = rows[0]?.answeredCount ?? 0;

  return (
    <Card className="xl:col-span-2">
      <CardHead
        title="문항별 남은 사람"
        meta={rows.length > 0 ? `첫 문항 ${first}명 기준 · 회색은 프로필로 대체되는 문항` : undefined}
      />
      {rows.length === 0 ? (
        <p className="py-10 text-center text-label-1 text-slate-400">데이터가 없습니다.</p>
      ) : (
        <>
          {worst && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-label-1 text-amber-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                <b>{worst.orderIndex + 1}번 “{worst.questionText}”</b>에서 앞 문항의 {worst.retentionPercent}%만
                남았습니다. 손볼 곳이 하나라면 여기입니다.
              </span>
            </div>
          )}
          <ul className="mt-3">
            {rows.map((row, i) => {
              const isWorst = worst?.orderIndex === row.orderIndex;
              return (
                <li
                  key={row.orderIndex}
                  className={cn(
                    "flex items-center gap-3 py-1.5",
                    i !== rows.length - 1 && "border-b border-slate-100",
                  )}
                >
                  <span className="w-6 shrink-0 text-label-2 text-slate-400">{row.orderIndex + 1}</span>
                  <span
                    title={row.questionText}
                    className={cn(
                      "min-w-0 flex-1 truncate text-label-1",
                      isWorst ? "font-medium text-amber-800" : row.isSkippable ? "text-slate-400" : "text-slate-600",
                    )}
                  >
                    {row.questionText}
                    {/* 응답 수가 적은 이유가 이탈이 아니라 생략이라는 걸 표시해야 오독하지 않는다. */}
                    {row.isSkippable && (
                      <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-label-2 text-slate-500">
                        프로필로 대체
                      </span>
                    )}
                  </span>
                  <Bar
                    pct={first > 0 ? (row.answeredCount / first) * 100 : 0}
                    color={isWorst ? "#f59e0b" : row.isSkippable ? "#e6ebf3" : "#93b4f0"}
                    className="w-[120px] shrink-0"
                  />
                  <span className="w-8 shrink-0 text-right text-label-1 font-bold text-slate-900">
                    {row.answeredCount}
                  </span>
                  <span
                    className={cn(
                      "w-12 shrink-0 text-right text-label-2",
                      !row.isSkippable && row.retentionPercent < 90 ? "text-amber-700" : "text-slate-400",
                    )}
                  >
                    {row.isSkippable ? "-" : `${row.retentionPercent}%`}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}

export function AssessmentStatsView({ data, days }: { data: AssessmentStats; days: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="진단 시작" value={String(data.startedCount)} unit="건" caption={`최근 ${days}일`} />
        <Stat label="진단 완료" value={String(data.completedCount)} unit="건" />
        <Stat
          label="완료율"
          value={String(data.completionRatePercent)}
          unit="%"
          caption={`${data.startedCount - data.completedCount}건이 중간에 멈춤`}
        />
        <Stat
          label="평균 소요"
          value={data.avgMinutes > 0 ? String(data.avgMinutes) : "-"}
          unit="분"
          caption={
            data.durationSampleCount > 0
              ? `중앙값 ${data.medianMinutes}분 · 표본 ${data.durationSampleCount}건`
              : "완료 건이 없습니다"
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionDropoff rows={data.sectionProgress} />
        {/* 오른쪽 칸. 왼쪽의 이탈과 나란히 놓아 "어디서 새고, 무엇이 나오나"가 한 줄에서 읽힌다. */}
        <RecommendationRanking rows={data.recommendations} />
        <QuestionDropoff rows={data.questionDropoff} worst={data.worstDropoff} />
      </div>
    </div>
  );
}
