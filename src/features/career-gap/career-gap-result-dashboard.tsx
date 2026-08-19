"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  FileText,
  GraduationCap,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  trackCareerGapItemViewedAction,
  trackCareerGapJobClickedAction,
  trackCareerGapRecommendationClickedAction,
  trackCareerGapSimulationViewedAction,
} from "./career-gap-actions";
import type { CareerGapItemView, CareerGapResultView, RequirementCategory } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  QUALIFICATION: "자격",
  SKILL: "스킬",
  EXPERIENCE: "경력",
  DRIVING: "운전",
  EDUCATION: "학력",
  COMPUTER: "컴퓨터활용",
  EMPLOYMENT_TYPE: "고용형태",
  WORK_SCHEDULE: "근무시간",
  LANGUAGE: "외국어",
  PHYSICAL: "체력",
  OTHER: "기타",
};

const DIFFICULTY_LABELS: Record<string, string> = { LOW: "준비 쉬움", MEDIUM: "준비 보통", HIGH: "준비 어려움" };
const CONFIDENCE_LABELS: Record<string, string> = { HIGH: "신뢰도 높음", MEDIUM: "신뢰도 보통", LOW: "참고용" };
const RECOMMENDATION_KIND_LABELS: Record<string, string> = {
  QUALIFICATION: "자격 준비",
  TRAINING: "실무교육",
  SKILL: "스킬 준비",
  RESUME: "이력서 보완",
  COVER_LETTER: "자기소개서 보완",
};

function categoryLabel(category: RequirementCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}

function GapItemRow({ item, analysisId }: { item: CareerGapItemView; analysisId: string }) {
  const viewedRef = useRef(false);

  return (
    <details
      className="group rounded-xl border border-border bg-white px-4 py-3"
      onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open && !viewedRef.current) {
          viewedRef.current = true;
          void trackCareerGapItemViewedAction({ analysisId, requirementId: item.requirementId, marketRate: item.marketMentionRate });
        }
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div>
          <p className="text-body-2 font-semibold text-slate-800">{item.requirementName}</p>
          <p className="mt-0.5 text-label-2 text-slate-400">
            {categoryLabel(item.requirementCategory)} · 채용시장 언급률 {item.marketMentionRate}%
          </p>
        </div>
        {item.projectedEligibleJobCount !== undefined && item.gapScore > 0 && (
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-label-1 font-bold text-emerald-700">
            +{item.gapScore}건
          </span>
        )}
      </summary>
      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-label-1 text-slate-600">
        <p>{item.reason}</p>
        <p className="text-slate-400">
          필수 {item.marketRequiredRate}% · 우대 {item.marketPreferredRate}% · {DIFFICULTY_LABELS[item.preparationDifficulty]}
        </p>
        {item.projectedEligibleJobCount !== undefined && (
          <p className="font-medium text-brand-blue-700">
            이 조건을 충족하면 지원 가능한 공고가 {item.relatedJobSampleSize > 0 ? "약 " : ""}
            {item.projectedEligibleJobCount}건으로 늘어날 수 있어요.
          </p>
        )}
        {item.resumeGapNote && <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">{item.resumeGapNote.message}</p>}
      </div>
    </details>
  );
}

export function CareerGapResultDashboard({ result }: { result: CareerGapResultView }) {
  const simulationTracked = useRef(false);

  useEffect(() => {
    if (simulationTracked.current || result.multiConditionSimulations.length === 0) return;
    simulationTracked.current = true;
    const top = result.multiConditionSimulations[result.multiConditionSimulations.length - 1];
    void trackCareerGapSimulationViewedAction({
      analysisId: result.analysisId,
      requirementIds: top.requirementIds,
      projectedJobCount: top.eligibleJobCount,
    });
  }, [result.analysisId, result.multiConditionSimulations]);

  const targetLabel = result.destinationName ?? result.occupationName ?? "선택하신 직업";

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-brand-blue-50 to-white p-6 sm:p-8">
        <p className="text-label-1 font-semibold text-brand-blue-600">취업 준비도 확인</p>
        <h1 className="mt-1 text-title-2 font-extrabold text-slate-900 sm:text-headline-3">{targetLabel} 취업 준비도</h1>

        <div className="mt-5 flex items-end gap-3">
          <p className="text-headline-1 font-extrabold text-brand-blue-600">{result.readinessScore}</p>
          <p className="pb-2 text-body-2 font-semibold text-slate-500">점</p>
        </div>
        <Progress value={result.readinessScore} className="mt-2 h-2.5" />

        <p className="mt-4 text-label-1 text-slate-500">
          분석 기준 · 최근 관련 채용공고{" "}
          <strong className="text-slate-700">
            {result.isDataSufficient ? `${result.marketSampleSize}건` : `${result.marketSampleSize}건 (데이터 부족, 참고용)`}
          </strong>{" "}
          · {CONFIDENCE_LABELS[result.confidence]}
        </p>
        {result.isMockData && (
          <p className="mt-1 text-label-2 text-amber-600">※ 현재 개발환경 테스트 데이터를 기준으로 분석되었습니다.</p>
        )}
        <p className="mt-3 text-label-2 text-slate-400">
          이 점수는 실제 취업 확률이 아니라, 현재 채용공고 요구조건 대비 회원님의 준비 수준을 나타내는 당사 내부
          매칭 점수입니다.
        </p>
      </div>

      {/* Section 5 하이라이트: 한 가지를 보완한다면 */}
      {result.topPriorityItem && (
        <div className="rounded-2xl border border-brand-blue-200 bg-brand-blue-50/60 p-6">
          <p className="flex items-center gap-1.5 text-label-1 font-semibold text-brand-blue-700">
            <Target className="size-4" /> 한 가지를 보완한다면
          </p>
          <p className="mt-2 text-body-1 font-bold text-slate-900">
            지금 회원님에게 가장 취업기회를 넓혀주는 준비는{" "}
            <span className="text-brand-blue-600">{result.topPriorityItem.requirementName}</span>입니다.
          </p>
          <p className="mt-2 text-label-1 text-slate-600">
            관련 공고의 {result.topPriorityItem.marketMentionRate}%가 이 조건을 요구하거나 우대합니다.
            {result.topPriorityItem.projectedEligibleJobCount !== undefined && (
              <>
                {" "}
                충족 시 지원 가능한 공고가 {result.currentEligibleJobCount}건 → {result.topPriorityItem.projectedEligibleJobCount}건으로{" "}
                <strong className="text-brand-blue-700">+{result.topPriorityItem.gapScore}건</strong> 늘어날 수 있어요.
              </>
            )}
          </p>
        </div>
      )}

      {/* Section 1: 이미 잘 준비된 항목 */}
      {result.wellPreparedItems.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-6">
          <h2 className="flex items-center gap-1.5 text-body-1 font-bold text-slate-900">
            <CheckCircle2 className="size-5 text-emerald-500" /> 이미 잘 준비된 항목
          </h2>
          <ul className="mt-4 space-y-2">
            {result.wellPreparedItems.map((item) => (
              <li key={item.requirementId} className="flex items-center gap-2 text-label-1 text-slate-700">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                {item.requirementName}
                <span className="text-label-2 text-slate-400">(채용시장 언급률 {item.marketMentionRate}%)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Section 2: 보완하면 좋은 항목 */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="flex items-center gap-1.5 text-body-1 font-bold text-slate-900">
          <AlertTriangle className="size-5 text-amber-500" /> 보완하면 좋은 항목
        </h2>
        <p className="mt-1 text-label-1 text-slate-400">시장에서 자주 요구되는 순서로 정리했어요.</p>
        {result.improvementItems.length === 0 ? (
          <p className="mt-4 text-label-1 text-slate-500">현재 확인된 부족 조건이 없어요. 잘 준비되어 있어요!</p>
        ) : (
          <div className="mt-4 space-y-2">
            {result.improvementItems.map((item, i) => (
              <div key={item.requirementId} className="flex items-start gap-2">
                <span className="mt-3 flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-label-2 font-bold text-slate-500">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <GapItemRow item={item} analysisId={result.analysisId} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 복수 조건 Simulation */}
      {result.multiConditionSimulations.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-6">
          <h2 className="text-body-2 font-bold text-slate-900">여러 조건을 함께 준비하면</h2>
          <div className="mt-3 space-y-1.5">
            {result.multiConditionSimulations.map((sim) => (
              <div
                key={sim.requirementIds.join("+")}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-label-1"
              >
                <span className="text-slate-600">{sim.label}</span>
                <span className="font-semibold text-brand-blue-600">
                  {sim.eligibleJobCount}건 (+{sim.deltaFromBaseline})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: 추가 준비 추천 */}
      {(result.recommendations.length > 0 || result.resumeGapNotes.length > 0 || result.coverLetterGapNotes.length > 0) && (
        <div className="rounded-2xl border border-border bg-white p-6">
          <h2 className="flex items-center gap-1.5 text-body-1 font-bold text-slate-900">
            <GraduationCap className="size-5 text-brand-blue-500" /> 추가 준비 추천
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {result.recommendations.map((rec) => (
              <Link
                key={`${rec.requirementId}-${rec.kind}`}
                href={rec.kind === "RESUME" || rec.kind === "COVER_LETTER" ? "/resume" : "/consulting"}
                onClick={() =>
                  void trackCareerGapRecommendationClickedAction({
                    analysisId: result.analysisId,
                    requirementId: rec.requirementId,
                    contentId: rec.contentId,
                  })
                }
                className="rounded-xl border border-border p-4 transition-colors hover:border-brand-blue-300 hover:bg-brand-blue-50/40"
              >
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-label-2 font-medium text-slate-500">
                  {RECOMMENDATION_KIND_LABELS[rec.kind] ?? rec.kind}
                </span>
                <p className="mt-2 text-body-2 font-semibold text-slate-800">{rec.title}</p>
                <p className="mt-1 text-label-1 text-slate-500">{rec.description}</p>
              </Link>
            ))}
          </div>

          {result.resumeGapNotes.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="flex items-center gap-1.5 text-label-1 font-semibold text-amber-700">
                <FileText className="size-4" /> 이력서에서 확인해보세요
              </p>
              {result.resumeGapNotes.map((note) => (
                <p key={note.requirementId} className="rounded-lg bg-amber-50 px-3 py-2 text-label-1 text-amber-700">
                  {note.message}
                </p>
              ))}
            </div>
          )}
          {result.coverLetterGapNotes.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="flex items-center gap-1.5 text-label-1 font-semibold text-amber-700">
                <Sparkles className="size-4" /> 자기소개서에서 확인해보세요
              </p>
              {result.coverLetterGapNotes.map((note) => (
                <p key={note.requirementId} className="rounded-lg bg-amber-50 px-3 py-2 text-label-1 text-amber-700">
                  {note.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 4: 지금 지원 가능한 채용공고 */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="flex items-center gap-1.5 text-body-1 font-bold text-slate-900">
          <Briefcase className="size-5 text-slate-500" /> 지금 지원 가능한 채용공고
        </h2>
        <p className="mt-1 text-label-1 text-slate-400">
          현재 조건 기준 지원 가능 <strong className="text-slate-700">{result.currentEligibleJobCount}건</strong>
        </p>
        {result.eligibleJobs.length === 0 ? (
          <p className="mt-4 text-label-1 text-slate-500">현재 조건과 높게 일치하는 공고를 아직 찾지 못했어요.</p>
        ) : (
          <div className="mt-4 space-y-1.5">
            {result.eligibleJobs.map((job) => (
              <Link
                key={job.jobId}
                href={`/jobs/${job.jobId}`}
                onClick={() => void trackCareerGapJobClickedAction({ analysisId: result.analysisId, jobId: job.jobId })}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 hover:bg-brand-blue-50"
              >
                <span className="truncate text-label-1 font-medium text-slate-700">
                  {job.title} · {job.companyName}
                </span>
                <span className="shrink-0 flex items-center gap-1 text-label-1 font-bold text-brand-blue-600">
                  <BadgeCheck className="size-3.5" />
                  {job.matchScore}점
                </span>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/jobs">전체 채용공고 보기</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/career-gap">
            <RotateCcw className="size-4" />
            다른 직업 다시 분석하기
          </Link>
        </Button>
        <Button className="flex-1 bg-brand-blue-500 hover:bg-brand-blue-600" asChild>
          <Link href="/resume">이력서 보완하기</Link>
        </Button>
      </div>
    </div>
  );
}
