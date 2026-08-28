import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import {
  getCoverLetterTemplateRepository,
  getJobBookmarkRepository,
  getJobRepository,
  getResumeRepository,
} from "@/lib/repositories";
import { listExperienceBankForUser } from "@/services/experience-bank.service";
import { buildQuestionCatalog } from "@/lib/cover-letter/questions";
import { CoverLetterWizard } from "@/features/cover-letter/cover-letter-wizard";

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

  const [templates, bookmarks, experiences, incomingJob, resume] = await Promise.all([
    getCoverLetterTemplateRepository().findAll({ status: "active" }),
    getJobBookmarkRepository().findAllByUser(user.id),
    listExperienceBankForUser(user.id),
    targetJobId ? getJobRepository().findById(targetJobId) : Promise.resolve(null),
    resumeId ? getResumeRepository().findById(resumeId) : Promise.resolve(null),
  ]);

  const ordered = [...templates].sort((a, b) => a.orderIndex - b.orderIndex);
  if (ordered.length === 0) redirect("/resume");

  /*
    공고를 고르는 화면에 쓸 목록. 찜 목록은 id만 들고 있어 공고를 따로 읽어야 한다.
    마감돼 내려간 공고는 지금 지원할 수 없으니 고를 수 없게 뺀다.
    공고 상세에서 바로 넘어온 경우(searchParams.job)는 찜하지 않았어도 맨 앞에 둔다.
  */
  const bookmarked = (await Promise.all(bookmarks.map((b) => getJobRepository().findById(b.jobId))))
    .filter((job) => job !== null)
    .filter((job) => job.isActive && job.id !== incomingJob?.id);
  const pickableJobs = (incomingJob ? [incomingJob, ...bookmarked] : bookmarked).map((job) => ({
    id: job.id,
    title: job.title,
    companyName: job.companyName,
  }));

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
          jobs={pickableJobs}
          initialJobId={incomingJob?.id}
          initialTitle={incomingJob ? `${incomingJob.title} 지원용 자기소개서` : title}
          experiences={experiences}
          resumeId={resume && resume.userId === user.id ? resume.id : undefined}
          targetOccupationId={targetOccupationId}
        />
      </div>
    </div>
  );
}
