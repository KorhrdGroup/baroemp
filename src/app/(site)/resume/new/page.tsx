import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getResumeTemplateRepository, getJobRepository } from "@/lib/repositories";
import { getResumePrefill, listResumesForUser, MAX_RESUMES_PER_USER } from "@/services/resume.service";
import { buildResumeSectionOptions } from "@/lib/resume/completeness";
import { ResumeWizard } from "@/features/resume/resume-wizard";
import { PageHead } from "@/components/layout/page-head";

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
    // /draft3 색 구성 (globals.css .draft3-theme): 흰 머리 아래 회색 바탕에 흰 단계 카드.
    <div className="draft3-theme">
      <PageHead icon="resume"
        crumbs={[{ label: "이력서", href: "/resume" }, { label: "새 이력서" }]}
        title="새 이력서 만들기"
        description="양식을 고르고 담을 항목과 불러올 정보를 정하면, 편집 화면으로 넘어가요."
      />
      <div className="bg-baro-page">
      <div className="mx-auto max-w-6xl px-4.5 pt-10 pb-20 lg:px-8">
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
    </div>
  );
}
