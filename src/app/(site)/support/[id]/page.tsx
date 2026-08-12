import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getSupportProgramRepository } from "@/lib/repositories";
import { resolveSupportMatchProfile } from "@/services/support-search.service";
import { evaluateSupportEligibility } from "@/services/support-eligibility.service";
import { getRelatedContentForSupportProgram } from "@/services/support-interest.service";
import { SupportDetailView } from "@/features/support/support-detail-view";
import { isSupportBookmarkedAction } from "@/features/support/support-actions";
import { findCareerProfileByUserId } from "@/lib/repositories";
import { getCurrentUser } from "@/lib/auth/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const program = await getSupportProgramRepository().findById(id);
  return {
    title: program ? `${program.title} | 한평생 바로취업` : "지원제도 | 한평생 바로취업",
  };
}

export default async function SupportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = await getSupportProgramRepository().findById(id);
  if (!program) notFound();

  const anonymousId = (await cookies()).get("baro_anonymous_id")?.value;
  const currentUser = await getCurrentUser();
  const matchProfile = await resolveSupportMatchProfile(currentUser?.id, anonymousId);
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
