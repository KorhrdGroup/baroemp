import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getResumeTemplateRepository, getJobRepository } from "@/lib/repositories";
import { ResumeTemplatePicker } from "@/features/resume/resume-template-picker";

export const metadata: Metadata = {
  title: "새 이력서 만들기 | 한평생 바로취업",
};

export default async function ResumeNewPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; occupation?: string; title?: string }>;
}) {
  await requireUser("/resume/new");
  const { job: targetJobId, occupation: targetOccupationId, title } = await searchParams;

  const [templates, job] = await Promise.all([
    getResumeTemplateRepository().findAll({ status: "active" }),
    targetJobId ? getJobRepository().findById(targetJobId) : Promise.resolve(null),
  ]);
  const sorted = [...templates].sort((a, b) => a.orderIndex - b.orderIndex);
  const suggestedTitle = job ? `${job.title} 지원용 이력서` : title;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-label-1 font-semibold text-brand-blue-600">Step 1</p>
        <h1 className="mt-1 text-title-2 font-bold text-slate-900 sm:text-headline-3">어떤 이력서 양식을 사용하시겠어요?</h1>
        <p className="mt-2 text-body-2-reading text-slate-500">
          {job
            ? `"${job.title}" 공고에 맞춰 이력서를 준비해요. 양식을 고르면 내 정보로 자동 채워드려요.`
            : "양식을 선택하면 보유하신 정보(이름/연락처/경력/자격/스킬 등)를 자동으로 불러와 채워드려요."}
        </p>
      </div>

      <ResumeTemplatePicker
        templates={sorted}
        targetJobId={targetJobId}
        targetOccupationId={targetOccupationId}
        suggestedTitle={suggestedTitle}
      />
    </div>
  );
}
