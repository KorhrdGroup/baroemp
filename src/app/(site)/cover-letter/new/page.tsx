import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getCoverLetterTemplateRepository, getResumeRepository } from "@/lib/repositories";
import { listExperienceBankForUser } from "@/services/experience-bank.service";
import { listCoverLettersForUser, MAX_COVER_LETTERS_PER_USER } from "@/services/cover-letter.service";
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

  const [templates, experiences, resume, existing] = await Promise.all([
    getCoverLetterTemplateRepository().findAll({ status: "active" }),
    listExperienceBankForUser(user.id),
    resumeId ? getResumeRepository().findById(resumeId) : Promise.resolve(null),
    listCoverLettersForUser(user.id),
  ]);

  const ordered = [...templates].sort((a, b) => a.orderIndex - b.orderIndex);
  if (ordered.length === 0) redirect("/resume");
  // 주소로 바로 들어와도 상한이면 시작할 수 없다. 목록에 왜 못 만드는지 적혀 있다.
  if (existing.length >= MAX_COVER_LETTERS_PER_USER) redirect("/resume");

  return (
    // 방법 고르기 화면은 짧아서, 회색 바탕을 화면 끝까지 깔아야 흰 띠가 안 남는다.
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-6 pt-10 pb-20 lg:px-8">
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
