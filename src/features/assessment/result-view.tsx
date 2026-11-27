import Link from "next/link";
import { BookOpen, Briefcase, ChevronRight, ExternalLink, FileText, RotateCcw, UserPlus } from "lucide-react";
import { PageHead } from "@/components/layout/page-head";
import { REGION_LABELS } from "@/lib/labels";
import { splitRecommendationTracks } from "./recommendation-tracks";
import type { AssessmentResult, CareerContent, Occupation, OccupationRecommendation } from "@/types";
import { OccupationRecommendationCard, jobSearchKeyword, type ExternalCourseLink } from "./occupation-recommendation-card";
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
  /** 제목에서 부를 이름. 지원금 결과처럼 "김미영님", 없으면 "회원님". */
  userName?: string;
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
  userName,
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
  /* 오른쪽 "다음 할 일" 카드가 기준으로 삼는 직업: 지금 바로 지원할 수 있는 첫 직업, 없으면 첫 추천. */
  const nextOcc = readyRecs[0] ?? top;

  return (
    <>
      {/* 세부 화면 공통 머리: 위치 줄 → 큰 제목 → 결과 요약. */}
      <PageHead icon="assessment"
        crumbs={[{ label: "직업진단", href: "/assessment" }, { label: "진단 결과" }]}
        title={`${userName ? `${userName}님` : "회원님"}께 잘 맞는 직업을 찾았어요`}
        description={result.summary}
      />

    {/*
      본문은 회색 바탕에 흰 카드(모서리 20px, 테두리 없음). 머리 제목과 같은 왼쪽 선에 맞춘다.
      넓은 화면은 오른쪽에 "다음 할 일" 카드를 두고 스크롤을 따라오게 한다(아래 고정 단추 줄을 대신한다).
    */}
    <div className="bg-baro-page">
    <div className="mx-auto max-w-7xl px-4.5 pt-4 pb-12 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8 lg:px-8">
     <div className="max-w-3xl space-y-6 lg:max-w-none">
      {/* 진단이 붙인 태그(generatedTags, 예: "기타경력" · "즉시준비가능")는 내부 분류 말이라 화면에 늘어놓지 않는다. */}
      {top && (
        <p className="pt-6 text-body-3 font-medium text-slate-600">
          추천 결과는 취업을 약속하는 것이 아니라, 성향과 조건을 바탕으로 한 참고 정보예요.
        </p>
      )}

      {readyRecs.length > 0 && (
        <div className="space-y-4">
          {/* 준비 트랙이 없으면 화면 전체가 한 목록이므로 굳이 머리말로 가르지 않는다. */}
          {preparationRecs.length > 0 && (
            <div className="pt-4">
              <h2 className="text-title-3 font-bold text-slate-900">지금 바로 지원할 수 있는 직업</h2>
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
            <h2 className="text-title-3 font-bold text-slate-900">준비하면 열리는 직업</h2>
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
        <div className="rounded-card bg-white p-10 text-center text-body-2 font-medium text-slate-600">
          조건에 맞는 추천 직업을 찾지 못했어요. 답변을 조금 더 넓혀서 다시 시도해보세요.
        </div>
      )}

      {contentRecs.length > 0 && (
        <section id="courses" className="scroll-mt-24 pt-4">
          <h2 className="text-title-3 font-bold text-slate-900">도움이 되는 자격 취득 과정</h2>
          <p className="mt-1 text-body-3 font-medium text-slate-600">검사 결과와 회원님의 조건에 맞춰 고른 자격 과정이에요.</p>
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
                className="rounded-card bg-white p-5"
              >
                <p className="flex items-center gap-1.5 text-body-2 font-semibold text-slate-800">
                  {content.title}
                  {content.externalUrl && <ExternalLink className="size-3.5 shrink-0 text-slate-500" />}
                </p>
                {/* 요약이 제목을 그대로 되풀이하는 과정이 있어, 다를 때만 보인다. */}
                {(() => {
                  const sub = [content.summary, content.shortDescription].find((t) => t && t.trim() !== content.title.trim());
                  return sub && <p className="mt-1 text-body-3 font-medium text-slate-600">{sub}</p>;
                })()}
              </TrackedLink>
            ))}
          </div>
        </section>
      )}

      {/* 안내문은 흐름 안에 남기고, 실제 동작은 아래 고정 바에서 한다. */}
      <div className="flex items-center gap-3 rounded-card bg-baro-blue-50 p-5 sm:p-6">
        <UserPlus className="size-5 shrink-0 text-baro-blue" />
        <p className="text-body-3 font-medium text-slate-700">
          {isAnonymous
            ? "회원가입하면 이 결과를 저장하고 1:1 상담을 받을 수 있어요."
            : "마이페이지에서 이 결과를 언제든 다시 확인할 수 있어요."}
        </p>
      </div>

     </div>

      {nextOcc && (
        <aside className="hidden lg:sticky lg:top-24 lg:mt-10 lg:block">
          <NextStepsCard
            sessionId={sessionId}
            userId={result.userId}
            anonymousId={result.anonymousId}
            occupationId={nextOcc.occupationId}
            occupationName={nextOcc.occupationName}
            postingCount={jobCounts?.[nextOcc.occupationId]?.total ?? 0}
            regionLabel={regionLabel}
            courseTitles={contentRecs.map((c) => c.title)}
            isAnonymous={isAnonymous}
          />
        </aside>
      )}
    </div>
    </div>

      {/*
        ── 하단 CTA (흰 바탕 + 위쪽 얇은 선, 그림자 없음) ──
        화면 아래에 붙어 따라오다가 본문이 끝나면 그 자리에 멈춘다(sticky). fixed 로 두면 맨 끝에서 푸터를 가린다.
      */}
      <div className="sticky bottom-0 z-40 border-t border-border bg-white lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center px-4.5 py-3 lg:px-8">
          <div className="flex w-full max-w-3xl items-center gap-3">
            <Link
              href="/assessment"
              className="flex h-12 shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-body-3 font-semibold text-slate-800"
            >
              <RotateCcw className="size-4" />
              다시 진단하기
            </Link>
            <Link
              href="/mypage"
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-atomic-blue-600 px-4 text-body-2 font-semibold text-white"
            >
              {isAnonymous ? "회원가입하고 저장하기" : "마이페이지로 이동"}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * 넓은 화면 오른쪽 카드. 결과를 읽고 끝나지 않게 바로 이어 갈 세 가지(공고 · 이력서 · 자격 과정)를 줄로 둔다.
 * 마이페이지 · 다시 진단은 맨 아래 작은 줄로. 좁은 화면은 이 카드 대신 아래 고정 단추 줄을 쓴다.
 */
function NextStepsCard({
  sessionId,
  userId,
  anonymousId,
  occupationId,
  occupationName,
  postingCount,
  regionLabel,
  courseTitles,
  isAnonymous,
}: {
  sessionId: string;
  userId?: string;
  anonymousId?: string;
  occupationId: string;
  occupationName: string;
  postingCount: number;
  regionLabel?: string;
  courseTitles: string[];
  isAnonymous: boolean;
}) {
  const keyword = jobSearchKeyword(occupationName);
  const rowClass = "flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3.5 transition-colors hover:bg-baro-blue-50";
  const rowInner = (Icon: typeof Briefcase, title: string, sub: string) => (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-baro-blue">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-2 font-semibold break-keep text-slate-900">{title}</span>
        <span className="mt-0.5 block text-body-3 font-medium break-keep text-slate-600">{sub}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-slate-500" />
    </>
  );

  return (
    <div className="rounded-card bg-white p-6">
      <p className="text-title-3 font-bold text-slate-900">이제 이렇게 해 보세요</p>
      <p className="mt-1 text-body-3 font-medium break-keep text-slate-600">가장 잘 맞는 직업인 {occupationName} 기준이에요.</p>
      <ul className="mt-5 space-y-2">
        <li>
          {/* 내 지역에 공고가 없으면 전국(region=all)으로 넘긴다. 카드 안 "채용공고 보기"와 같은 규칙. */}
          <TrackedLink
            sessionId={sessionId}
            kind="occupation"
            targetId={occupationId}
            userId={userId}
            anonymousId={anonymousId}
            href={`/jobs?keyword=${encodeURIComponent(keyword)}${postingCount > 0 ? "" : "&region=all"}`}
            className={rowClass}
          >
            {rowInner(
              Briefcase,
              `${keyword} 공고 보기`,
              postingCount > 0
                ? `${regionLabel ? `${regionLabel} ` : ""}${postingCount}건`
                : `${regionLabel ? `${regionLabel}에는 아직 없어 ` : ""}전국에서 찾아봐요`,
            )}
          </TrackedLink>
        </li>
        <li>
          <Link href={`/resume/new?occupation=${occupationId}&title=${encodeURIComponent(occupationName)}`} className={rowClass}>
            {rowInner(FileText, "이 직업으로 이력서 쓰기", "내 정보를 불러와 빠르게 시작해요")}
          </Link>
        </li>
        {courseTitles.length > 0 && (
          <li>
            <a href="#courses" className={rowClass}>
              {rowInner(BookOpen, "자격 과정 알아보기", courseTitles.slice(0, 2).join(" · "))}
            </a>
          </li>
        )}
      </ul>
      <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 text-body-3 font-semibold text-slate-600">
        <Link href="/assessment" className="flex h-10 items-center gap-1.5">
          <RotateCcw className="size-4" />
          다시 진단하기
        </Link>
        <Link href="/mypage" className="flex h-10 items-center gap-0.5">
          {isAnonymous ? "회원가입하고 저장하기" : "마이페이지"}
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
