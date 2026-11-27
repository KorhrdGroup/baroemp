import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getProfileRepository } from "@/lib/repositories/profile-repository";
import { AccountForm } from "@/features/profile/account-form";
import { MarketingConsentSwitch } from "@/features/profile/marketing-consent-switch";
import { WithdrawButton } from "@/features/profile/withdraw-button";
import { PageHead } from "@/components/layout/page-head";

export const metadata: Metadata = { title: "내 정보 | 한평생 바로취업" };

/**
 * 내 정보 - 이름 · 휴대전화 · 이메일, 마케팅 정보 받기, 탈퇴.
 * 희망 조건(취업 프로필)과 나눠 둔다: 희망 조건을 채우기 전에도 연락처를 고치거나 탈퇴할 수 있어야 한다.
 */
export default async function MyPageAccountPage() {
  const user = await requireUser("/mypage/account");
  const profile = await getProfileRepository().findById(user.id);

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4.5 py-10 lg:px-8">
        <p className="text-body-3 font-medium text-slate-600">프로필 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }

  return (
    <div className="draft3-theme page-fill flex flex-1 flex-col">
      <PageHead
        crumbs={[{ label: "마이페이지", href: "/mypage" }, { label: "내 정보" }]}
        title="내 정보"
        description="연락받을 정보와 소식 받기를 고칠 수 있어요."
      />
      <div className="flex-1 bg-baro-page">
        <div className="mx-auto max-w-3xl space-y-5 px-4.5 pt-10 pb-20 lg:px-8">
          <div className="rounded-card bg-white p-6 sm:p-8">
            <AccountForm profile={profile} />
          </div>

          <div className="flex items-center gap-4 rounded-card bg-white p-6 sm:px-8">
            <div className="min-w-0 flex-1">
              <p id="account-marketing" className="text-body-1 font-semibold text-slate-900">
                마케팅 정보 · 알림톡 받기
              </p>
              <p className="mt-0.5 text-body-2 font-medium break-keep text-slate-600">
                지원금 · 교육 · 서비스 소식을 카카오톡으로 받아요.
              </p>
            </div>
            <MarketingConsentSwitch initial={profile.marketingConsent} labelledBy="account-marketing" />
          </div>

          {/* 되돌릴 수 없는 일이라 카드 밖 오른쪽 아래에 작게 떨어뜨려 둔다. */}
          <div className="flex justify-end pt-2">
            <WithdrawButton />
          </div>
        </div>
      </div>
    </div>
  );
}
