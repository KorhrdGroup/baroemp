import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getResumeTemplateRepository, getJobRepository } from "@/lib/repositories";
import { getResumePrefill } from "@/services/resume.service";
import { isRequiredSection, resumeSectionLabel } from "@/lib/resume/completeness";
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

  const [templates, job, prefill] = await Promise.all([
    getResumeTemplateRepository().findAll({ status: "active" }),
    targetJobId ? getJobRepository().findById(targetJobId) : Promise.resolve(null),
    getResumePrefill(user.id),
  ]);

  const ordered = [...templates].sort((a, b) => a.orderIndex - b.orderIndex);
  if (ordered.length === 0) redirect("/resume");

  /*
    고를 수 있는 항목은 양식들의 항목을 모두 모아 중복만 없앤다. 양식별로 나눠 보여주면
    "내 양식에 없는 항목은 못 담나" 하고 멈춘다. 순서는 처음 나온 양식의 순서를 따른다.
  */
  const sectionOptions = [...new Set(ordered.flatMap((t) => t.sections))].map((code) => ({
    code,
    label: resumeSectionLabel(code),
    required: isRequiredSection(code),
  }));

  return (
    // 양식 고르기 화면은 짧아서, 회색 바탕을 화면 끝까지 깔아야 흰 띠가 안 남는다.
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-6 lg:px-8">
        <ResumeWizard
          templates={ordered.map((t) => ({
            id: t.id,
            code: t.code,
            name: t.name,
            description: t.description,
            sections: t.sections,
          }))}
          sectionOptions={sectionOptions}
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
