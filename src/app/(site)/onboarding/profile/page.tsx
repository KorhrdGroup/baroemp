import type { Metadata } from "next";
import { BellRing } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getProfileRepository } from "@/lib/repositories/profile-repository";
import { findCareerProfileByUserId } from "@/lib/repositories";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { OnboardingProfileForm } from "@/features/onboarding/onboarding-profile-form";

export const metadata: Metadata = { title: "취업 프로필 입력 | 한평생 바로취업" };

export default async function OnboardingProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextParam } = await searchParams;
  const next = sanitizeNextPath(nextParam, "/mypage");
  const user = await requireUser(`/onboarding/profile?next=${encodeURIComponent(next)}`);

  const [profile, careerProfile] = await Promise.all([
    getProfileRepository().findById(user.id),
    findCareerProfileByUserId(user.id),
  ]);

  return (
    // data-wizard: 입력에 집중시키는 화면이라 globals.css에서 푸터를 숨긴다.
    <div data-wizard="true" className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-label-1 font-semibold text-brand-blue-600">가입 완료</p>
      <h1 className="mt-1 text-title-2 font-bold break-keep text-slate-900 sm:text-headline-3">
        어떤 일을 찾고 계신지 알려주세요
      </h1>
      <p className="mt-3 text-body-2-reading text-slate-500">
        입력하신 정보로 맞춤 채용공고와 받을 수 있는 지원금을 찾아드립니다. 지금 넘어가셔도 서비스는 그대로
        이용할 수 있고, 나중에 마이페이지에서 입력하실 수 있어요.
      </p>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-brand-blue-200 bg-white px-4 py-3">
        <BellRing className="mt-0.5 size-4 shrink-0 text-brand-blue-600" />
        <p className="text-label-1 break-keep text-slate-600">
          입력해두시면 조건에 맞는 새 공고·지원금이 열릴 때 알림톡으로 먼저 알려드려요.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white p-6 sm:p-8">
        <OnboardingProfileForm
          careerProfile={careerProfile}
          next={next}
          needsPhone={!profile?.phone}
          needsMarketingConsent={!profile?.marketingConsent}
        />
      </div>
    </div>
  );
}
