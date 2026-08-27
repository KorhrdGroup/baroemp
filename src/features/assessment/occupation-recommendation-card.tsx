import Link from "next/link";
import { AlertTriangle, ChevronDown, FileText, ListChecks, MapPin, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Occupation, OccupationRecommendation } from "@/types";
import { cn } from "@/lib/utils";
import { TrackedLink } from "./tracked-link";

const GRADE_STYLE: Record<OccupationRecommendation["grade"], string> = {
  "매우 잘 맞아요": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "잘 맞아요": "bg-brand-blue-50 text-brand-blue-700 ring-brand-blue-200",
  "도전해볼 만해요": "bg-amber-50 text-amber-700 ring-amber-200",
  "준비가 더 필요해요": "bg-slate-100 text-slate-600 ring-slate-200",
};

/**
 * 적합도 숫자도 등급 배지와 같은 계열로 물들인다.
 * 숫자만 늘 파랑이면 "준비가 더 필요해요"인 직업에서도 점수가 강조되어 신호가 어긋난다.
 */
const GRADE_SCORE_STYLE: Record<OccupationRecommendation["grade"], string> = {
  "매우 잘 맞아요": "text-emerald-700",
  "잘 맞아요": "text-brand-blue-600",
  "도전해볼 만해요": "text-amber-700",
  "준비가 더 필요해요": "text-slate-500",
};

const SUBSCORES: { key: keyof OccupationRecommendation; label: string }[] = [
  { key: "dimensionFitScore", label: "직무 적합도" },
  { key: "conditionFitScore", label: "근무조건 적합도" },
  { key: "experienceUtilizationScore", label: "경력 활용도" },
  { key: "entryFeasibilityScore", label: "진입 가능성" },
];

interface OccupationRecommendationCardProps {
  rank: number;
  rec: OccupationRecommendation;
  occupation?: Occupation;
  sessionId: string;
  userId?: string;
  anonymousId?: string;
  defaultOpen?: boolean;
  regionLabel?: string;
  /** 실제 jobs DB 기준 채용건수 (STEP 4). 아직 계산 전이거나 jobCategoryCode가 없으면 undefined. */
  jobCount?: { total: number; highMatchCount: number };
}

export function OccupationRecommendationCard({
  rank,
  rec,
  occupation,
  sessionId,
  userId,
  anonymousId,
  defaultOpen,
  regionLabel,
  jobCount,
}: OccupationRecommendationCardProps) {
  const postingCount = jobCount?.total ?? 0;

  return (
    <details
      open={defaultOpen}
      className={cn(
        // 순위는 왼쪽 번호 배지가 이미 짚어주므로 카드에는 테두리를 두지 않는다.
        "group rounded-xl bg-white",
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl text-body-2 font-bold",
              rank === 1 ? "bg-brand-blue-400 text-white" : "bg-slate-100 text-slate-500",
            )}
          >
            {rank}
          </span>
          <div>
            <p className="text-body-1 font-bold text-slate-900 sm:text-title-3">{rec.occupationName}</p>
            <p className="mt-1 text-label-1 text-slate-400">{occupation?.category ?? "추천 직업"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("hidden rounded-full px-3 py-1 text-label-1 font-semibold ring-1 sm:inline-flex", GRADE_STYLE[rec.grade])}>
            {rec.grade}
          </span>
          <div className="text-right">
            <p className={cn("text-title-2 font-extrabold", GRADE_SCORE_STYLE[rec.grade])}>{rec.totalScore}</p>
            <p className="text-label-2 text-slate-400">적합도</p>
          </div>
          <ChevronDown className="size-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
        </div>
      </summary>

      <div className="border-t border-slate-100 px-5 py-6 sm:px-7">
        <span className={cn("inline-flex rounded-full px-3 py-1 text-label-1 font-semibold ring-1 sm:hidden", GRADE_STYLE[rec.grade])}>
          {rec.grade}
        </span>

        {occupation?.description && (
          <p className="mt-3 text-body-2-reading text-slate-600">{occupation.description}</p>
        )}

        {/* 세부 적합도 */}
        {/* 네 지표를 각각 회색 상자에 담는다. 배경 없이 나열하면 어디까지가 한 지표인지 흐리다. */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SUBSCORES.map(({ key, label }) => (
            <div key={label} className="rounded-xl bg-slate-50 p-4">
              <p className="text-label-2 text-slate-400">{label}</p>
              <p className="mt-1 text-title-3 font-bold text-slate-900">{rec[key] as number}</p>
              <Progress value={rec[key] as number} className="mt-2 h-1.5" />
            </div>
          ))}
        </div>

        {/* 왜 추천되었는지 / 고려할 점 */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="flex items-center gap-1.5 text-label-1 font-semibold text-slate-700">
              <Sparkles className="size-4 text-brand-blue-600" /> 왜 추천되었나요
            </p>
            <ul className="mt-2 space-y-1.5 text-label-1 text-slate-600">
              {rec.reasons.map((reason) => (
                <li key={reason}>· {reason}</li>
              ))}
            </ul>
          </div>
          {rec.risks.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-label-1 font-semibold text-slate-700">
                <AlertTriangle className="size-4 text-orange-500" /> 고려할 점
              </p>
              <ul className="mt-2 space-y-1.5 text-label-1 text-slate-600">
                {rec.risks.map((risk) => (
                  <li key={risk}>· {risk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 부족한 조건 / 필요한 자격 */}
        {(rec.missingConditions.length > 0 || rec.requiredQualifications.length > 0) && (
          <div className="mt-6">
            <p className="flex items-center gap-1.5 text-label-1 font-semibold text-slate-700">
              <ListChecks className="size-4 text-slate-500" /> 필요한 자격 · 부족한 조건
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {rec.requiredQualifications.map((q) => (
                <span key={q} className="rounded-full bg-slate-100 px-3 py-1 text-label-1 text-slate-600">
                  {q}
                </span>
              ))}
              {rec.missingConditions
                .filter((c) => !rec.requiredQualifications.includes(c))
                .map((c) => (
                  <span key={c} className="rounded-full bg-orange-50 px-3 py-1 text-label-1 text-orange-700">
                    {c}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Career Path */}
        <div className="mt-6">
          <p className="text-label-1 font-semibold text-slate-700">예상 준비경로</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-label-1 text-slate-500">
            {["현재 상태", "필요 자격", "실무 준비", "이력서/면접", "채용지원"].map((step, i) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-border px-3 py-1.5">{step}</span>
                {i < 4 && <span className="text-slate-300">→</span>}
              </span>
            ))}
          </div>
        </div>

        {/* 관련 채용공고 */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-4">
          <div className="text-label-1 text-slate-600">
            <p className="flex items-center gap-1.5">
              <MapPin className="size-4 text-slate-400" />
              {regionLabel ? `${regionLabel} 지역 ` : ""}현재 관련 채용공고 <strong className="text-slate-800">{postingCount}건</strong>
            </p>
            {jobCount && jobCount.highMatchCount > 0 && (
              <p className="mt-1 text-label-1 text-brand-blue-600">
                회원님의 조건과 높은 일치 <strong>{jobCount.highMatchCount}건</strong>
              </p>
            )}
          </div>
          <TrackedLink
            sessionId={sessionId}
            kind="occupation"
            targetId={rec.occupationId}
            userId={userId}
            anonymousId={anonymousId}
            /*
             * 직종 코드가 아니라 직업 이름으로 검색해 넘긴다.
             * 코드로 넘기면 검색창이 빈 채로 드롭다운만 바뀌어 무엇으로 좁혀졌는지 알기 어렵고,
             * 사용자가 검색어를 고쳐 넓히거나 좁힐 수도 없다.
             * 이름 검색은 제목·본문까지 훑어 코드가 다른 관련 공고도 함께 걸린다.
             */
            href={`/jobs?keyword=${encodeURIComponent(rec.occupationName)}`}
            className="rounded-lg bg-brand-blue-400 px-4 py-2 text-label-1 font-semibold text-white hover:bg-brand-blue-600"
          >
            채용공고 보기
          </TrackedLink>
        </div>

        {/* 이력서 준비 연결 (스펙 34번: 강제하지 않는 선택적 CTA) */}
        <div className="mt-3 flex flex-wrap justify-end gap-4">
          <Link
            href={`/resume/new?occupation=${rec.occupationId}&title=${encodeURIComponent(rec.occupationName)}`}
            className="flex items-center gap-1.5 text-label-1 font-semibold text-brand-blue-600 hover:underline"
          >
            <FileText className="size-4" />
            {rec.occupationName} 취업용 이력서 준비하기
          </Link>
        </div>
      </div>
    </details>
  );
}
