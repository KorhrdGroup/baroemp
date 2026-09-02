import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getProfileRepository } from "@/lib/repositories/profile-repository";
import { findCareerProfileByUserId, getUserQualificationRepository } from "@/lib/repositories";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";

export const metadata: Metadata = { title: "취업 프로필 입력 | 한평생 바로취업" };

export default async function OnboardingProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextParam } = await searchParams;
  const next = sanitizeNextPath(nextParam, "/mypage");
  const user = await requireUser(`/onboarding/profile?next=${encodeURIComponent(next)}`);

  const [profile, careerProfile, heldQualifications] = await Promise.all([
    getProfileRepository().findById(user.id),
    findCareerProfileByUserId(user.id),
    getUserQualificationRepository().findByUserId(user.id),
  ]);

  return (
    <OnboardingWizard
      careerProfile={careerProfile}
      next={next}
      needsPhone={!profile?.phone}
      needsMarketingConsent={!profile?.marketingConsent}
      heldQualificationNames={heldQualifications.map((q) => q.name)}
    />
  );
}
