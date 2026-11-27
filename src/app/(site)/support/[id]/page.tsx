import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getSupportAssessmentSessionRepository, getSupportProgramRepository } from "@/lib/repositories";
import { resolveSupportMatchProfile } from "@/services/support-search.service";
import { evaluateSupportEligibility } from "@/services/support-eligibility.service";
import { toSupportMatchProfile } from "@/services/support-assessment.service";
import { getRelatedContentForSupportProgram } from "@/services/support-interest.service";
import { SupportDetailView } from "@/features/support/support-detail-view";
import { isSupportBookmarkedAction } from "@/features/support/support-actions";
import { findCareerProfileByUserId } from "@/lib/repositories";
import { getCurrentUser, requireUser } from "@/lib/auth/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const program = await getSupportProgramRepository().findById(id);
  return {
    title: program ? `${program.title} | 한평생 바로취업` : "지원제도 | 한평생 바로취업",
  };
}

export default async function SupportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 목록과 같은 이유로 로그인 필요. 로그인 후 이 화면으로 그대로 돌아온다.
  await requireUser(`/support/${id}`);
  const program = await getSupportProgramRepository().findById(id);
  if (!program) notFound();

  const anonymousId = (await cookies()).get("baro_anonymous_id")?.value;
  const currentUser = await getCurrentUser();
  /*
    "내 조건과 비교"는 지원금 찾기 결과 목록과 같은 기준이어야 한다. 목록의 맞은 조건은 마지막으로 마친 지원금 진단 답변으로 셈하므로,
    그 진단이 있으면 같은 답변으로 비교한다. 취업 프로필(희망 조건)로 셈하면 나이 · 지역이 진단 때와 달라
    목록은 "나이 맞음", 상세는 "연령 조건 부족"처럼 서로 어긋났다. 진단이 없을 때만 취업 프로필로 셈한다.
  */
  const latestSupportSession = currentUser
    ? (await getSupportAssessmentSessionRepository().findAll({ userId: currentUser.id, status: "completed" }))[0]
    : undefined;
  const matchProfile = latestSupportSession
    ? toSupportMatchProfile(latestSupportSession.answers)
    : await resolveSupportMatchProfile(currentUser?.id, anonymousId);
  const match = matchProfile ? await evaluateSupportEligibility(program, matchProfile) : null;

  const careerProfile = currentUser ? ((await findCareerProfileByUserId(currentUser.id)) ?? undefined) : undefined;
  const recommendedContents = await getRelatedContentForSupportProgram(program, careerProfile);
  const isBookmarked = currentUser ? await isSupportBookmarkedAction(program.id) : false;

  return (
    <SupportDetailView
      program={program}
      match={match}
      recommendedContents={recommendedContents}
      hasMatchSignal={Boolean(matchProfile)}
      isAuthenticated={Boolean(currentUser)}
      isBookmarked={isBookmarked}
    />
  );
}
