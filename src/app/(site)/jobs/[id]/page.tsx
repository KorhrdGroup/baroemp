import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { findCareerProfileByUserId, getJobApplicationRepository, getJobRepository } from "@/lib/repositories";
import { hasMatchSignal, toJobMatchSignal } from "@/lib/jobs/job-match-signal";
import { getAnonymousCareerSignal } from "@/services/job-search.service";
import { evaluateJobFit } from "@/services/job-match.service";
import { findContentForMissingQualifications } from "@/services/job-content-recommendation.service";
import { compareUserToJobRequirements } from "@/services/job-requirement-comparison.service";
import { JobDetailView } from "@/features/jobs/job-detail-view";
import { isJobBookmarkedAction } from "@/features/jobs/job-actions";
import { getCurrentUser, requireUser } from "@/lib/auth/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJobRepository().findById(id);
  return { title: job ? `${job.title} - ${job.companyName} | 한평생 바로취업` : "일자리 찾기 | 한평생 바로취업" };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 목록과 같은 이유로 로그인 필요. 로그인 후 이 화면으로 그대로 돌아온다.
  await requireUser(`/jobs/${id}`);
  const job = await getJobRepository().findById(id);
  if (!job) notFound();

  const anonymousId = (await cookies()).get("baro_anonymous_id")?.value;
  const [anonymousSignal, currentUser] = await Promise.all([getAnonymousCareerSignal(anonymousId), getCurrentUser()]);
  /*
    로그인 회원은 취업 프로필(온보딩·진단으로 채운 값)로 비교한다. 전에는 비회원용 익명 진단 신호만 봐서,
    진단을 마친 회원에게도 "직업진단을 받으면 비교해볼 수 있어요"가 떴다.
    프로필 행은 있어도 값이 비어 있으면(온보딩 건너뜀) 신호 없음으로 치고 익명 신호로 물러난다.
  */
  const memberProfile = currentUser ? ((await findCareerProfileByUserId(currentUser.id)) ?? undefined) : undefined;
  const profileSignal =
    memberProfile && hasMatchSignal(toJobMatchSignal(memberProfile)) ? memberProfile : anonymousSignal;
  const match = evaluateJobFit(profileSignal, job);
  const [isBookmarked, requirementComparison, applications] = await Promise.all([
    currentUser ? isJobBookmarkedAction(job.id) : Promise.resolve(false),
    currentUser ? compareUserToJobRequirements(currentUser.id, job) : Promise.resolve([]),
    // 회원이 이 공고에 "지원했어요"를 표시했는지. 마이페이지 5단계의 근거가 된다.
    currentUser ? getJobApplicationRepository().findAllByUser(currentUser.id).catch(() => []) : Promise.resolve([]),
  ]);
  const applicationStatus = applications.find((a) => a.jobId === job.id)?.status ?? null;

  const heldQualifications = new Set(profileSignal?.heldQualifications ?? []);
  const missingQualCodes = job.preferredQualifications.filter((code) => !heldQualifications.has(code));
  const recommendedContents = await findContentForMissingQualifications(missingQualCodes);

  return (
    <JobDetailView
      job={job}
      match={match}
      recommendedContents={recommendedContents}
      hasCareerSignal={Boolean(profileSignal)}
      isAuthenticated={Boolean(currentUser)}
      isBookmarked={isBookmarked}
      requirementComparison={requirementComparison}
      applicationStatus={applicationStatus}
    />
  );
}
