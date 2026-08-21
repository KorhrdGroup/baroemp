import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getCoverLetterTemplateRepository, getJobRepository, getResumeRepository } from "@/lib/repositories";
import { CoverLetterAutoCreate } from "@/features/cover-letter/cover-letter-auto-create";

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
  const defaultTemplate = [...templates].sort((a, b) => a.orderIndex - b.orderIndex)[0];
  if (!defaultTemplate) redirect("/cover-letter");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <CoverLetterAutoCreate
        templateId={defaultTemplate.id}
        title={job ? `${job.title} 지원용 자기소개서` : title}
        resumeId={resume && resume.userId === user.id ? resume.id : undefined}
        targetJobId={targetJobId}
        targetOccupationId={targetOccupationId}
      />
    </div>
  );
}
