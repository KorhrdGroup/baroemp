import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getResumeTemplateRepository, getJobRepository } from "@/lib/repositories";
import { getResumePrefill, listResumesForUser, MAX_RESUMES_PER_USER } from "@/services/resume.service";
import { buildResumeSectionOptions } from "@/lib/resume/completeness";
import { ResumeWizard } from "@/features/resume/resume-wizard";

export const metadata: Metadata = {
  title: "새 이력서 만들기 | 한평생 바로취업",
};

export default async function ResumeNewPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; occupation?: string; title?: string }>;
}) {
  const user = await requireUser("/resume/new");
  const { job: targetJobId, occupation: targetOccupationId, title } = await searchParams;

  const [templates, job, prefill, existing] = await Promise.all([
    getResumeTemplateRepository().findAll({ status: "active" }),
    targetJobId ? getJobRepository().findById(targetJobId) : Promise.resolve(null),
    getResumePrefill(user.id),
    listResumesForUser(user.id),
  ]);

  const ordered = [...templates].sort((a, b) => a.orderIndex - b.orderIndex);
  if (ordered.length === 0) redirect("/resume");
  // 주소로 바로 들어와도 상한이면 시작할 수 없다. 목록에 왜 못 만드는지 적혀 있다.
  if (existing.length >= MAX_RESUMES_PER_USER) redirect("/resume");

  return (
    // 양식 고르기 화면은 짧아서, 회색 바탕을 화면 끝까지 깔아야 흰 띠가 안 남는다.
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-6 pt-10 pb-20 lg:px-8">
        <ResumeWizard
          templates={ordered.map((t) => ({
            id: t.id,
            code: t.code,
            name: t.name,
            description: t.description,
            sections: t.sections,
          }))}
          sectionOptions={buildResumeSectionOptions(ordered)}
          prefill={{
            name: prefill.name,
            email: prefill.email,
            phone: prefill.phone,
            address: prefill.address,
            desiredJobTitle: prefill.desiredJobTitle,
            qualifications: prefill.qualifications.map((q) => q.name),
            skills: prefill.skills.map((s) => s.name),
          }}
          initialTitle={job ? `${job.title} 지원용 이력서` : title}
          targetJobId={targetJobId}
          targetOccupationId={targetOccupationId}
        />
      </div>
    </div>
  );
}
