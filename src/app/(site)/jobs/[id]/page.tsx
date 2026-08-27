import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getJobRepository } from "@/lib/repositories";
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
  return { title: job ? `${job.title} - ${job.companyName} | 한평생 바로취업` : "채용공고 | 한평생 바로취업" };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 목록과 같은 이유로 로그인 필요. 로그인 후 이 화면으로 그대로 돌아온다.
  await requireUser(`/jobs/${id}`);
  const job = await getJobRepository().findById(id);
  if (!job) notFound();

  const anonymousId = (await cookies()).get("baro_anonymous_id")?.value;
  const [profileSignal, currentUser] = await Promise.all([
    getAnonymousCareerSignal(anonymousId),
    getCurrentUser(),
  ]);
  const match = evaluateJobFit(profileSignal, job);
  const isBookmarked = currentUser ? await isJobBookmarkedAction(job.id) : false;
  const requirementComparison = currentUser ? await compareUserToJobRequirements(currentUser.id, job) : [];

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
    />
  );
}
