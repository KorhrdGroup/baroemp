import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getResumeTemplateRepository, getJobRepository } from "@/lib/repositories";
import { ResumeAutoCreate } from "@/features/resume/resume-auto-create";

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
  const defaultTemplate = [...templates].sort((a, b) => a.orderIndex - b.orderIndex)[0];
  if (!defaultTemplate) redirect("/resume");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <ResumeAutoCreate
        templateId={defaultTemplate.id}
        title={job ? `${job.title} 지원용 이력서` : title}
        targetJobId={targetJobId}
        targetOccupationId={targetOccupationId}
      />
    </div>
  );
}
