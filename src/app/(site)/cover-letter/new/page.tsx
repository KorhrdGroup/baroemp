import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getCoverLetterTemplateRepository, getJobRepository, getResumeRepository } from "@/lib/repositories";
import { CoverLetterTemplatePicker } from "@/features/cover-letter/cover-letter-template-picker";

export const metadata: Metadata = {
  title: "새 자기소개서 작성 | 한평생 바로취업",
};

export default async function CoverLetterNewPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; occupation?: string; resume?: string; title?: string }>;
}) {
  const user = await requireUser("/cover-letter/new");
  const { job: targetJobId, occupation: targetOccupationId, resume: resumeId, title } = await searchParams;

  const [templates, job, resume] = await Promise.all([
    getCoverLetterTemplateRepository().findAll({ status: "active" }),
    targetJobId ? getJobRepository().findById(targetJobId) : Promise.resolve(null),
    resumeId ? getResumeRepository().findById(resumeId) : Promise.resolve(null),
  ]);
  const sorted = [...templates].sort((a, b) => a.orderIndex - b.orderIndex);
  const validResumeId = resume && resume.userId === user.id ? resume.id : undefined;
  const suggestedTitle = job ? `${job.title} 지원용 자기소개서` : title;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold text-brand-blue-600">Step 1</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">어떤 자기소개서 양식을 사용하시겠어요?</h1>
        <p className="mt-2 text-[15px] text-slate-500">
          {job ? `"${job.title}" 공고에 맞춰 자기소개서를 준비해요.` : "상황에 맞는 문항 구성을 선택해주세요."}
        </p>
      </div>

      <CoverLetterTemplatePicker
        templates={sorted}
        resumeId={validResumeId}
        targetJobId={targetJobId}
        targetOccupationId={targetOccupationId}
        suggestedTitle={suggestedTitle}
      />
    </div>
  );
}
