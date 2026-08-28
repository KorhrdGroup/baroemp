import { CountBreakdown, Stat } from "./stats-primitives";
import type { ResumeStats, SupportStats } from "@/services/service-stats.service";

/** 통계 > 지원금 화면. 진단을 끝까지 하는지, 어떤 조건의 사람이 오는지를 본다. */
export function SupportStatsView({ data, days }: { data: SupportStats; days: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="진단 시작" value={String(data.startedCount)} unit="건" caption={`최근 ${days}일`} />
        <Stat label="진단 완료" value={String(data.completedCount)} unit="건" />
        <Stat
          label="완료율"
          value={String(data.completionRatePercent)}
          unit="%"
          caption={`${data.startedCount - data.completedCount}건이 중간에 멈춤`}
        />
      </div>

      {/* 아래 분포는 모두 완료한 진단 기준이다. 중간에 멈춘 답변은 조건이 덜 채워져 섞으면 왜곡된다. */}
      <div className="grid gap-4 xl:grid-cols-3">
        <CountBreakdown title="지역" meta="완료 기준" rows={data.byRegion} />
        <CountBreakdown title="취업상태" meta="완료 기준" rows={data.byEmploymentStatus} />
        <CountBreakdown title="소득수준" meta="완료 기준" rows={data.byIncomeBand} />
      </div>
    </div>
  );
}

/** 통계 > 이력서 화면. 얼마나 쓰다 마는지, 첨삭까지 가는지를 본다. */
export function ResumeStatsView({ data, days }: { data: ResumeStats; days: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="작성 문서" value={String(data.totalCount)} unit="건" caption={`최근 ${days}일`} />
        <Stat
          label="평균 완성도"
          value={data.totalCount > 0 ? String(data.avgCompleteness) : "-"}
          unit="%"
          caption="건수로 가중한 평균"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <CountBreakdown title="작성 상태" rows={data.byStatus} />
        <CountBreakdown title="첨삭 상태" rows={data.byReviewStatus} />
        <CountBreakdown title="템플릿" rows={data.byTemplate} />
      </div>
    </div>
  );
}
