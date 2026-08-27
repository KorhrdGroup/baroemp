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
import { countJobsForOccupation } from "@/services/job-search.service";
import type { CareerProfile } from "@/types";

export const metadata: Metadata = {
  title: "직업진단 결과 | 한평생 바로취업",
};

export default async function AssessmentResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  // 목록과 같은 이유로 로그인 필요. 로그인 후 이 화면으로 그대로 돌아온다.
  await requireUser(`/assessment/result/${sessionId}`);
  const found = await getAssessmentResultBySession(sessionId);
  if (!found) notFound();
  const { result } = found;

  await logAssessmentResultViewed(sessionId, result.userId, result.anonymousId);

  const [occupations, contentRecs] = await Promise.all([
    getOccupationRepository().findAll(),
    getContentRecommendationsForResult(result),
  ]);
  const occupationsById = new Map(occupations.map((o) => [o.id, o]));

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
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-10 sm:px-6 lg:px-8">
      <ResultView
        sessionId={sessionId}
        result={result}
        occupationsById={occupationsById}
        contentRecs={contentRecs}
        jobCounts={jobCounts}
      />
    </div>
    </div>
  );
}
