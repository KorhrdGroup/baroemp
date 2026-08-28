import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getCoverLetterTemplateRepository, getResumeRepository } from "@/lib/repositories";
import { listExperienceBankForUser } from "@/services/experience-bank.service";
import { buildQuestionCatalog } from "@/lib/cover-letter/questions";
import { CoverLetterWizard } from "@/features/cover-letter/cover-letter-wizard";

export const metadata: Metadata = {
  title: "새 자기소개서 작성 | 한평생 바로취업",
};

export default async function CoverLetterNewPage({
  searchParams,
}: {
  searchParams: Promise<{ occupation?: string; resume?: string; title?: string }>;
}) {
  const user = await requireUser("/cover-letter/new");
  const { occupation: targetOccupationId, resume: resumeId, title } = await searchParams;

  const [templates, experiences, resume] = await Promise.all([
    getCoverLetterTemplateRepository().findAll({ status: "active" }),
    listExperienceBankForUser(user.id),
    resumeId ? getResumeRepository().findById(resumeId) : Promise.resolve(null),
  ]);

  const ordered = [...templates].sort((a, b) => a.orderIndex - b.orderIndex);
  if (ordered.length === 0) redirect("/resume");

  return (
    // 방법 고르기 화면은 짧아서, 회색 바탕을 화면 끝까지 깔아야 흰 띠가 안 남는다.
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-6 lg:px-8">
        <CoverLetterWizard
          templates={ordered.map((t) => ({
            id: t.id,
            code: t.code,
            name: t.name,
            description: t.description,
            defaultQuestions: t.defaultQuestions,
          }))}
          catalog={buildQuestionCatalog(ordered)}
          initialTitle={title}
          experiences={experiences}
          resumeId={resume && resume.userId === user.id ? resume.id : undefined}
          targetOccupationId={targetOccupationId}
        />
      </div>
    </div>
  );
}
