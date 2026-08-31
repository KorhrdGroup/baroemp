import Link from "next/link";
import { cn } from "@/lib/utils";
import { interactiveCardClass } from "@/lib/ui-classes";
import { RotateCcw, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REGION_LABELS } from "@/lib/labels";
import type { AssessmentResult, CareerContent, Occupation } from "@/types";
import { OccupationRecommendationCard } from "./occupation-recommendation-card";
import { TrackedLink } from "./tracked-link";

interface ResultViewProps {
  sessionId: string;
  result: AssessmentResult;
  occupationsById: Map<string, Occupation>;
  contentRecs: CareerContent[];
  jobCounts?: Record<string, { total: number; highMatchCount: number }>;
}

export function ResultView({ sessionId, result, occupationsById, contentRecs, jobCounts }: ResultViewProps) {
  const top = result.recommendations[0];
  const regionLabel = result.extractedProfile.region ? REGION_LABELS[result.extractedProfile.region] : undefined;
  const isAnonymous = !result.userId;

  return (
    <div className="space-y-6">
      {/* 지원금 결과 화면과 같은 머리말: 배경 상자 없이 라벨 → 제목 → 안내문 순으로만 둔다. */}
      <div>
        <p className="text-label-1 font-semibold text-brand-blue-600">검사 결과</p>
        <h1 className="mt-1 text-title-2 font-bold text-slate-900 sm:text-headline-3">회원님께 잘 맞는 직업을 찾았습니다</h1>
        <p className="mt-2 max-w-2xl text-body-2-reading text-slate-600">{result.summary}</p>
        {top && (
          <p className="mt-2 text-label-1 text-slate-400">
            추천 가능성은 확정적인 취업 결과가 아닌, 성향·조건 기반의 참고 정보입니다.
          </p>
        )}
        {result.generatedTags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {result.generatedTags.map((tag) => (
              <span key={tag} className="rounded-full bg-white px-3 py-1 text-label-1 font-medium text-slate-700">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {result.recommendations.map((rec, i) => (
          <OccupationRecommendationCard
            key={rec.occupationId}
            rank={i + 1}
            rec={rec}
            occupation={occupationsById.get(rec.occupationId)}
            sessionId={sessionId}
            userId={result.userId}
            anonymousId={result.anonymousId}
            defaultOpen={i === 0}
            regionLabel={regionLabel}
            jobCount={jobCounts?.[rec.occupationId]}
          />
        ))}
        {result.recommendations.length === 0 && (
          <div className="rounded-xl bg-white p-10 text-center text-slate-500">
            조건에 맞는 추천 직업을 찾지 못했어요. 답변을 조금 더 넓혀서 다시 시도해보세요.
          </div>
        )}
      </div>

      {contentRecs.length > 0 && (
        <div className="rounded-xl bg-white p-6 sm:p-8">
          <h2 className="text-body-1 font-bold text-slate-900">도움이 되는 자격 취득 과정</h2>
          <p className="mt-1 text-label-1 text-slate-400">검사 결과와 회원님의 조건을 기준으로 추천된 자격 과정입니다.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {contentRecs.map((content) => (
              <TrackedLink
                key={content.id}
                sessionId={sessionId}
                kind="content"
                targetId={content.id}
                userId={result.userId}
                anonymousId={result.anonymousId}
                href={
                  content.type === "SUPPORT_PROGRAM"
                    ? "/support"
                    : content.type === "CONSULTING"
                      ? "/consulting"
                      : "/resume"
                }
                className={cn("rounded-xl bg-slate-50 p-4", interactiveCardClass)}
              >
                <p className="text-body-2 font-semibold text-slate-800">{content.title}</p>
                <p className="mt-1 text-label-1 text-slate-500">{content.summary ?? content.shortDescription}</p>
              </TrackedLink>
            ))}
          </div>
        </div>
      )}

      {/* 안내문은 흐름 안에 남기고, 실제 동작은 아래 고정 바에서 한다. */}
      <div className="flex items-center gap-3 rounded-xl bg-white p-6">
        <UserPlus className="size-5 shrink-0 text-brand-blue-600" />
        <p className="text-label-1 text-slate-600">
          {isAnonymous
            ? "회원가입하면 이 결과를 저장하고 1:1 상담을 받을 수 있어요."
            : "마이페이지에서 이 결과를 언제든 다시 확인할 수 있어요."}
        </p>
      </div>

      {/* ── 하단 고정 CTA (지원금 상세와 같은 구성) ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4.5 py-3 lg:px-8">
          <Button variant="outline" size="sm" className="h-12 shrink-0" asChild>
            <Link href="/assessment">
              <RotateCcw className="size-4" />
              다시 진단하기
            </Link>
          </Button>
          <Button className="h-12 flex-1 bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
            <Link href="/mypage">{isAnonymous ? "회원가입하고 저장하기" : "마이페이지로 이동"}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
