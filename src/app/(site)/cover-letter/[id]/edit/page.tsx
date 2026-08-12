import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getCoverLetterRepository } from "@/lib/repositories";
import { getCoverLetterDetail } from "@/services/cover-letter.service";
import { listExperienceBankForUser } from "@/services/experience-bank.service";
import { CoverLetterEditor } from "@/features/cover-letter/cover-letter-editor";

export const metadata: Metadata = {
  title: "자기소개서 편집 | 한평생 바로취업",
};

export default async function CoverLetterEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/cover-letter/${id}/edit`);

  const coverLetter = await getCoverLetterRepository().findById(id);
  if (!coverLetter || coverLetter.userId !== user.id) notFound();

  const [detail, experienceBank] = await Promise.all([getCoverLetterDetail(id), listExperienceBankForUser(user.id)]);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <CoverLetterEditor initialDetail={detail} experienceBank={experienceBank} />
    </div>
  );
}
