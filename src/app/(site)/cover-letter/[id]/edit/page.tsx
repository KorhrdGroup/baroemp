import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getCoverLetterRepository, getCoverLetterTemplateRepository } from "@/lib/repositories";
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

  // 양식 선택을 별도 Step으로 두지 않고 편집 화면 상단에서 바꿀 수 있게 목록을 함께 내려준다.
  const [detail, experienceBank, templates] = await Promise.all([
    getCoverLetterDetail(id),
    listExperienceBankForUser(user.id),
    getCoverLetterTemplateRepository().findAll({ status: "active" }),
  ]);
  if (!detail) notFound();

  const templateOptions = [...templates]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      hint: `문항 ${t.defaultQuestions.length}개`,
    }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <CoverLetterEditor initialDetail={detail} experienceBank={experienceBank} templates={templateOptions} />
    </div>
  );
}
