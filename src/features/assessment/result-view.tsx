import Link from "next/link";
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
      <div className="rounded-3xl border border-border bg-gradient-to-br from-brand-blue-50 to-white p-6 sm:p-8">
        <p className="text-label-1 font-semibold text-brand-blue-600">검사 결과</p>
        <h1 className="mt-1 text-title-2 font-extrabold text-slate-900 sm:text-headline-3">회원님께 잘 맞는 직업을 찾았습니다</h1>
        <p className="mt-3 max-w-2xl text-body-2-reading text-slate-600">{result.summary}</p>
        {top && (
          <p className="mt-3 text-label-1 text-slate-400">
            추천 가능성은 확정적인 취업 결과가 아닌, 성향·조건 기반의 참고 정보입니다.
          </p>
        )}
        {result.generatedTags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {result.generatedTags.map((tag) => (
              <span key={tag} className="rounded-full bg-white px-3 py-1 text-label-1 font-medium text-brand-blue-600 ring-1 ring-brand-blue-100">
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
          <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center text-slate-500">
            조건에 맞는 추천 직업을 찾지 못했어요. 답변을 조금 더 넓혀서 다시 시도해보세요.
          </div>
        )}
      </div>

      {contentRecs.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-6 sm:p-8">
          <h2 className="text-body-1 font-bold text-slate-900">이 결과를 바탕으로 도움이 될 콘텐츠</h2>
          <p className="mt-1 text-label-1 text-slate-400">회원님의 Career Profile을 기반으로 추천된 콘텐츠입니다.</p>
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
                className="rounded-xl border border-border p-4 transition-colors hover:border-brand-blue-300 hover:bg-brand-blue-50/40"
              >
                <p className="text-body-2 font-semibold text-slate-800">{content.title}</p>
                <p className="mt-1 text-label-1 text-slate-500">{content.summary ?? content.shortDescription}</p>
              </TrackedLink>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <UserPlus className="size-5 text-brand-blue-600" />
          <p className="text-label-1 text-slate-600">
            {isAnonymous
              ? "회원가입하면 이 결과를 저장하고 1:1 상담을 받을 수 있어요."
              : "마이페이지에서 이 결과를 언제든 다시 확인할 수 있어요."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 rounded-xl" asChild>
            <Link href="/assessment">
              <RotateCcw className="size-4" />
              다시 진단하기
            </Link>
          </Button>
          <Button className="h-11 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600" asChild>
            <Link href="/mypage">{isAnonymous ? "회원가입하고 저장하기" : "마이페이지로 이동"}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
