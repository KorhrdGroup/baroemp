import Link from "next/link";
import { ExternalLink, RotateCcw, UserPlus } from "lucide-react";
import { PageHead } from "@/components/layout/page-head";
import { REGION_LABELS } from "@/lib/labels";
import { splitRecommendationTracks } from "./recommendation-tracks";
import type { AssessmentResult, CareerContent, Occupation, OccupationRecommendation } from "@/types";
import { OccupationRecommendationCard, type ExternalCourseLink } from "./occupation-recommendation-card";
import { TrackedLink } from "./tracked-link";

interface ResultViewProps {
  sessionId: string;
  result: AssessmentResult;
  occupationsById: Map<string, Occupation>;
  contentRecs: CareerContent[];
  /** 콘텐츠 id → 외부 신청/안내 페이지 URL. "준비하러 가기" 연결에 쓴다. */
  contentUrlById?: Record<string, string>;
  /** 외부 페이지가 등록된 취득 과정 목록. 자격 요건 칩을 과정 페이지로 잇는 데 쓴다. */
  externalCourses?: ExternalCourseLink[];
  /** 마이페이지 등에서 특정 직업을 보러 온 경우, 그 카드를 열어서 보여준다. */
  focusOccupationId?: string;
  jobCounts?: Record<string, { total: number; highMatchCount: number }>;
}

export function ResultView({
  sessionId,
  result,
  occupationsById,
  contentRecs: allContentRecs,
  contentUrlById = {},
  externalCourses = [],
  focusOccupationId,
  jobCounts,
}: ResultViewProps) {
  /** 지목된 카드가 있으면 그 카드만, 없으면 첫 카드를 열어둔다. */
  const isCardOpen = (occupationId: string, isFirstDefault: boolean) =>
    focusOccupationId ? focusOccupationId === occupationId : isFirstDefault;
  /** 추천 취득 과정 중 외부 페이지가 등록된 첫 콘텐츠의 URL. */
  const prepareUrlFor = (rec: OccupationRecommendation) =>
    [...(rec.readinessProjection?.map((p) => p.contentId) ?? []), ...(rec.recommendedContentIds ?? [])]
      .map((id) => contentUrlById[id])
      .find(Boolean);
  // 취업컨설팅은 공개 전이라 그리로 보내는 추천은 걸러 둔다. 열 때 이 줄만 지우면 된다.
  const contentRecs = allContentRecs.filter((c) => c.type !== "CONSULTING");
  const top = result.recommendations[0];

  /*
   * 두 트랙으로 가른다: 지금 조건으로 지원 가능한 직업 vs 자격을 갖추면 열리는 직업.
   * 자격 미보유를 순위 감점으로만 보여주면 "안 되는 이유"가 되지만,
   * 따로 모아 보여주면 "이것만 채우면 가능하다"는 로드맵이 된다.
   */
  const { ready: readyRecs, preparation: preparationRecs } = splitRecommendationTracks(result.recommendations);
  const regionLabel = result.extractedProfile.region ? REGION_LABELS[result.extractedProfile.region] : undefined;
  const isAnonymous = !result.userId;

  return (
    <>
      {/* 세부 화면 공통 머리: 위치 줄 → 큰 제목 → 결과 요약. */}
      <PageHead icon="assessment"
        crumbs={[{ label: "직업진단", href: "/assessment" }, { label: "진단 결과" }]}
        title="회원님께 잘 맞는 직업을 찾았습니다"
        description={result.summary}
      />

    <div className="mx-auto max-w-6xl px-4.5 pb-28 lg:px-8">
     <div className="max-w-3xl space-y-6">
      {(top || result.generatedTags.length > 0) && (
        <div className="pt-6">
          {top && (
            <p className="text-body-3 font-medium text-slate-600">
              추천 가능성은 확정적인 취업 결과가 아닌, 성향·조건 기반의 참고 정보입니다.
            </p>
          )}
          {result.generatedTags.length > 0 && (
            <div className={top ? "mt-4 flex flex-wrap gap-2" : "flex flex-wrap gap-2"}>
              {result.generatedTags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-body-3 font-medium text-slate-700">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {readyRecs.length > 0 && (
        <div className="space-y-4">
          {/* 준비 트랙이 없으면 화면 전체가 한 목록이므로 굳이 머리말로 가르지 않는다. */}
          {preparationRecs.length > 0 && (
            <div className="pt-4">
              <h2 className="text-title-3 font-extrabold text-slate-900">지금 바로 지원할 수 있는 직업</h2>
              <p className="mt-1 text-body-3 font-medium text-slate-600">현재 조건 그대로 도전할 수 있는 직업이에요.</p>
            </div>
          )}
          {readyRecs.map((rec, i) => (
            /* 마이페이지에서 특정 직업으로 들어올 때 앵커로 쓴다. scroll-mt는 상단 고정 헤더 높이만큼. */
            <div key={rec.occupationId} id={`occupation-${rec.occupationId}`} className="scroll-mt-24">
              <OccupationRecommendationCard
                rank={i + 1}
                rec={rec}
                occupation={occupationsById.get(rec.occupationId)}
                sessionId={sessionId}
                userId={result.userId}
                anonymousId={result.anonymousId}
                defaultOpen={isCardOpen(rec.occupationId, i === 0)}
                regionLabel={regionLabel}
                jobCount={jobCounts?.[rec.occupationId]}
                externalCourses={externalCourses}
              />
            </div>
          ))}
        </div>
      )}

      {preparationRecs.length > 0 && (
        <div className="space-y-4">
          <div className="pt-4">
            <h2 className="text-title-3 font-extrabold text-slate-900">준비하면 열리는 직업</h2>
            <p className="mt-1 text-body-3 font-medium text-slate-600">
              성향은 잘 맞지만 자격이 필요한 직업이에요. 자격을 갖추면 지원할 수 있는 범위가 넓어져요.
            </p>
          </div>
          {preparationRecs.map((rec, i) => (
            <div key={rec.occupationId} id={`occupation-${rec.occupationId}`} className="scroll-mt-24">
              <OccupationRecommendationCard
                rank={i + 1}
                rec={rec}
                variant="preparation"
                occupation={occupationsById.get(rec.occupationId)}
                sessionId={sessionId}
                userId={result.userId}
                anonymousId={result.anonymousId}
                defaultOpen={isCardOpen(rec.occupationId, readyRecs.length === 0 && i === 0)}
                regionLabel={regionLabel}
                jobCount={jobCounts?.[rec.occupationId]}
                prepareUrl={prepareUrlFor(rec)}
                externalCourses={externalCourses}
              />
            </div>
          ))}
        </div>
      )}

      {result.recommendations.length === 0 && (
        <div className="rounded-xl border border-border p-10 text-center text-body-2 font-medium text-slate-600">
          조건에 맞는 추천 직업을 찾지 못했어요. 답변을 조금 더 넓혀서 다시 시도해보세요.
        </div>
      )}

      {contentRecs.length > 0 && (
        <section className="pt-4">
          <h2 className="text-title-3 font-extrabold text-slate-900">도움이 되는 자격 취득 과정</h2>
          <p className="mt-1 text-body-3 font-medium text-slate-600">검사 결과와 회원님의 조건을 기준으로 추천된 자격 과정입니다.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {contentRecs.map((content) => (
              <TrackedLink
                key={content.id}
                sessionId={sessionId}
                kind="content"
                targetId={content.id}
                userId={result.userId}
                anonymousId={result.anonymousId}
                /* 외부 신청 페이지가 등록된 과정은 그리로 바로 보낸다. 없으면 기존 안내 화면 폴백. */
                href={
                  content.externalUrl ??
                  (content.type === "SUPPORT_PROGRAM"
                    ? "/support"
                    : content.type === "CONSULTING"
                      ? "/consulting"
                      : "/resume")
                }
                target={content.externalUrl ? "_blank" : undefined}
                rel={content.externalUrl ? "noopener noreferrer" : undefined}
                className="rounded-xl border border-border p-4"
              >
                <p className="flex items-center gap-1.5 text-body-2 font-semibold text-slate-800">
                  {content.title}
                  {content.externalUrl && <ExternalLink className="size-3.5 shrink-0 text-slate-500" />}
                </p>
                <p className="mt-1 text-body-3 font-medium text-slate-600">{content.summary ?? content.shortDescription}</p>
              </TrackedLink>
            ))}
          </div>
        </section>
      )}

      {/* 안내문은 흐름 안에 남기고, 실제 동작은 아래 고정 바에서 한다. */}
      <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-5 sm:p-6">
        <UserPlus className="size-5 shrink-0 text-atomic-blue-600" />
        <p className="text-body-3 font-medium text-slate-700">
          {isAnonymous
            ? "회원가입하면 이 결과를 저장하고 1:1 상담을 받을 수 있어요."
            : "마이페이지에서 이 결과를 언제든 다시 확인할 수 있어요."}
        </p>
      </div>

     </div>
    </div>

      {/* ── 하단 고정 CTA (공고 상세와 같은 구성: 흰 바탕 + 위쪽 얇은 선, 그림자 없음) ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center px-4.5 py-3 lg:px-8">
          <div className="flex w-full max-w-3xl items-center gap-3">
            <Link
              href="/assessment"
              className="flex h-12 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-body-3 font-semibold text-slate-800"
            >
              <RotateCcw className="size-4" />
              다시 진단하기
            </Link>
            <Link
              href="/mypage"
              className="flex h-12 flex-1 items-center justify-center rounded-lg bg-atomic-blue-600 px-4 text-body-2 font-bold text-white"
            >
              {isAnonymous ? "회원가입하고 저장하기" : "마이페이지로 이동"}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
