import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import {
  getAssessmentResultBySession,
  getContentRecommendationsForResult,
  logAssessmentResultViewed,
} from "@/features/assessment-engine/assessment-service";
import { ResultView } from "@/features/assessment/result-view";
import { getOccupationRepository } from "@/lib/repositories";
import { listContents } from "@/services/content.service";
import { countJobsForOccupation } from "@/services/job-search.service";
import type { CareerProfile } from "@/types";

export const metadata: Metadata = {
  title: "직업진단 결과 | 한평생 바로취업",
};

export default async function AssessmentResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ focus?: string }>;
}) {
  const { sessionId } = await params;
  // 마이페이지에서 특정 직업 행을 누르고 온 경우, 그 직업 카드를 열어서 보여준다.
  const { focus } = await searchParams;
  // 목록과 같은 이유로 로그인 필요. 로그인 후 이 화면으로 그대로 돌아온다.
  await requireUser(`/assessment/result/${sessionId}`);
  const found = await getAssessmentResultBySession(sessionId);
  if (!found) notFound();
  const { result } = found;

  /*
    조회 기록은 화면을 그리는 데 필요한 값이 아니다. 기다리면 그만큼 화면이 늦게 뜬다.
    쓰기를 걸어만 두고 넘어간다 - 실패해도 결과 화면은 보여야 한다.
  */
  void logAssessmentResultViewed(sessionId, result.userId, result.anonymousId).catch(() => {});

  const [occupations, contentRecs, publishedContents] = await Promise.all([
    getOccupationRepository().findAll(),
    getContentRecommendationsForResult(result),
    listContents({ status: "published" }),
  ]);
  const occupationsById = new Map(occupations.map((o) => [o.id, o]));
  // "준비하러 가기" 버튼·자격 요건 칩 링크용. 외부 페이지가 등록된 콘텐츠만 추린다.
  const contentUrlById = Object.fromEntries(
    publishedContents.filter((c) => c.externalUrl).map((c) => [c.id, c.externalUrl as string]),
  );
  const externalCourses = publishedContents
    .filter((c) => c.externalUrl)
    .map((c) => ({ contentId: c.id, title: c.title, url: c.externalUrl as string }));

  // extractedProfile을 CareerProfile 모양으로 감싸 매칭 건수(highMatchCount) 계산에 재사용한다.
  const now = new Date().toISOString();
  const profileSignal = {
    id: `result-signal-${result.id}`,
    userId: result.userId ?? result.anonymousId ?? "anonymous",
    createdAt: now,
    updatedAt: now,
    ...result.extractedProfile,
  } as CareerProfile;

  const jobCounts = Object.fromEntries(
    await Promise.all(
      result.recommendations.map(async (rec) => [
        rec.occupationId,
        await countJobsForOccupation(rec.occupationName, profileSignal),
      ] as const),
    ),
  );

  return (
    // 지원금 결과 화면과 같은 뼈대: 회색 바탕 위에 흰 카드를 쌓는다.
    <div className="min-h-screen bg-slate-50">
    <div className="mx-auto max-w-3xl px-4.5 pb-28 pt-10 lg:px-8">
      <ResultView
        sessionId={sessionId}
        result={result}
        occupationsById={occupationsById}
        contentRecs={contentRecs}
        contentUrlById={contentUrlById}
        externalCourses={externalCourses}
        focusOccupationId={focus}
        jobCounts={jobCounts}
      />
    </div>
    </div>
  );
}
