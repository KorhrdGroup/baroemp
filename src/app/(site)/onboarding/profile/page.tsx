import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getProfileRepository } from "@/lib/repositories/profile-repository";
import { findCareerProfileByUserId, getUserQualificationRepository } from "@/lib/repositories";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { MarketingConsentDialog } from "@/features/onboarding/marketing-consent-dialog";

export const metadata: Metadata = { title: "취업 프로필 입력 | 한평생 바로취업" };

export default async function OnboardingProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; consent?: string }>;
}) {
  const { next: nextParam, consent } = await searchParams;
  const next = sanitizeNextPath(nextParam, "/mypage");
  const user = await requireUser(`/onboarding/profile?next=${encodeURIComponent(next)}`);

  const [profile, careerProfile, heldQualifications] = await Promise.all([
    getProfileRepository().findById(user.id),
    findCareerProfileByUserId(user.id),
    getUserQualificationRepository().findByUserId(user.id),
  ]);

  /*
    소셜 가입 직후(콜백이 consent=1 을 붙여 보냄)에는 온보딩에 앞서 알림톡 수신 동의를 한 번 묻는다.
    이미 동의한 회원에게는 안 띄운다.
  */
  const askMarketingConsent = consent === "1" && !profile?.marketingConsent;

  return (
    <>
    {askMarketingConsent && <MarketingConsentDialog />}
    <OnboardingWizard
      careerProfile={careerProfile}
      next={next}
      needsPhone={!profile?.phone}
      needsMarketingConsent={!profile?.marketingConsent}
      heldQualificationNames={heldQualifications.map((q) => q.name)}
    />
    </>
  );
}
