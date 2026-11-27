import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getProfileRepository } from "@/lib/repositories/profile-repository";
import { findCareerProfileByUserId, getUserQualificationRepository } from "@/lib/repositories";
import { ProfileEditForm } from "@/features/profile/profile-edit-form";
import { PageHead } from "@/components/layout/page-head";

export const metadata: Metadata = { title: "희망 조건 | 한평생 바로취업" };

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
    // "마이페이지로 돌아가기"는 머리의 현재 위치(홈 › 마이페이지 › 희망 조건)가 맡는다.
    // 이름 · 연락처 · 탈퇴는 내 정보(/mypage/account)에 따로 있다.
    <div className="draft3-theme page-fill flex flex-1 flex-col">
      <PageHead
        crumbs={[{ label: "마이페이지", href: "/mypage" }, { label: "희망 조건" }]}
        title="희망 조건"
        description="적어주신 조건으로 맞는 직업 · 일자리 · 지원금을 찾아드려요."
      />
      <div className="flex-1 bg-baro-page">
      <div className="mx-auto max-w-3xl px-4.5 pt-10 pb-20 lg:px-8">
        <div className="rounded-card bg-white p-6 sm:p-8">
          <ProfileEditForm
            careerProfile={careerProfile}
            heldQualificationNames={heldQualifications.map((q) => q.name)}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
