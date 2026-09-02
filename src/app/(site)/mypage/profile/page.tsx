import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getProfileRepository } from "@/lib/repositories/profile-repository";
import { findCareerProfileByUserId, getUserQualificationRepository } from "@/lib/repositories";
import { ProfileEditForm } from "@/features/profile/profile-edit-form";

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
        <p className="text-label-1 text-slate-500">프로필 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4.5 py-10 lg:px-8">
      <Link href="/mypage" className="mb-4 flex items-center gap-1 text-label-1 text-slate-500">
        <ArrowLeft className="size-4" />
        마이페이지로 돌아가기
      </Link>

      <h1 className="text-title-2 font-bold text-slate-900">내 정보 수정</h1>
      <p className="mt-2 text-body-2-reading text-balance text-slate-500">
        입력한 정보는 맞춤 직업/채용/지원제도 추천에 활용됩니다.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-white p-6 sm:p-8">
        <ProfileEditForm
          profile={profile}
          careerProfile={careerProfile}
          heldQualificationNames={heldQualifications.map((q) => q.name)}
        />
      </div>
    </div>
  );
}
