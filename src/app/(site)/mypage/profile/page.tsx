import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getProfileRepository } from "@/lib/repositories/profile-repository";
import { findCareerProfileByUserId, getUserQualificationRepository } from "@/lib/repositories";
import { ProfileEditForm } from "@/features/profile/profile-edit-form";
import { PageHead } from "@/components/layout/page-head";

export const metadata: Metadata = { title: "내 정보 수정 | 한평생 바로취업" };

export default async function MyPageProfileEditPage() {
  const user = await requireUser("/mypage/profile");
  const [profile, careerProfile, heldQualifications] = await Promise.all([
    getProfileRepository().findById(user.id),
    findCareerProfileByUserId(user.id),
    getUserQualificationRepository()
      .findByUserId(user.id)
      .catch(() => []),
  ]);

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4.5 py-10 lg:px-8">
        <p className="text-body-3 font-medium text-slate-600">프로필 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }

  return (
    // 흰 머리 아래 회색 바탕에 흰 카드(테두리 · 그림자 없음). /draft3 색 구성 (globals.css .draft3-theme).
    // "마이페이지로 돌아가기"는 머리의 현재 위치(홈 › 마이페이지 › 내 정보 수정)가 맡는다.
    <div className="draft3-theme">
      <PageHead
        crumbs={[{ label: "마이페이지", href: "/mypage" }, { label: "내 정보 수정" }]}
        title="내 정보 수정"
        description="입력한 정보는 맞춤 직업/채용/지원제도 추천에 활용됩니다."
      />
      <div className="bg-baro-page">
      <div className="mx-auto max-w-3xl px-4.5 pt-10 pb-20 lg:px-8">
        <div className="rounded-card bg-white p-6 sm:p-8">
          <ProfileEditForm
            profile={profile}
            careerProfile={careerProfile}
            heldQualificationNames={heldQualifications.map((q) => q.name)}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
