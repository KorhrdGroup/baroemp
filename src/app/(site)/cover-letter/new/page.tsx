import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getCoverLetterTemplateRepository, getResumeRepository } from "@/lib/repositories";
import { listExperienceBankForUser } from "@/services/experience-bank.service";
import { listCoverLettersForUser, MAX_COVER_LETTERS_PER_USER } from "@/services/cover-letter.service";
import { buildQuestionCatalog } from "@/lib/cover-letter/questions";
import { CoverLetterWizard } from "@/features/cover-letter/cover-letter-wizard";
import { PageHead } from "@/components/layout/page-head";

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
    // 다른 세부 화면과 같이 흰 바탕에 화면 머리를 얹는다. 단계 카드는 얇은 선으로 나눈다.
    <>
      <PageHead icon="coverLetter"
        crumbs={[{ label: "자기소개서", href: "/cover-letter" }, { label: "새 자기소개서" }]}
        title="새 자기소개서"
        description="양식을 고르고 문항과 내 경험을 담으면, 편집 화면에서 AI 초안을 받을 수 있어요."
      />
      <div className="mx-auto max-w-6xl px-4.5 pt-10 pb-20 lg:px-8">
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
    </>
  );
}
