import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getCoverLetterRepository, getCoverLetterTemplateRepository, getResumeRepository } from "@/lib/repositories";
import { getCoverLetterDetail } from "@/services/cover-letter.service";
import { listExperienceBankForUser } from "@/services/experience-bank.service";
import { buildQuestionCatalog } from "@/lib/cover-letter/questions";
import { CoverLetterEditor } from "@/features/cover-letter/cover-letter-editor";

export const metadata: Metadata = {
  title: "자기소개서 편집 | 한평생 바로취업",
};

export default async function CoverLetterEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/cover-letter/${id}/edit`);

  const coverLetter = await getCoverLetterRepository().findById(id);
  if (!coverLetter || coverLetter.userId !== user.id) notFound();

  const [detail, experienceBank, templates, linkedResume] = await Promise.all([
    getCoverLetterDetail(id),
    listExperienceBankForUser(user.id),
    // 문항을 통째로 바꿀 때 고를 목록. 작성 시작 화면과 같은 목록을 쓴다.
    getCoverLetterTemplateRepository().findAll({ status: "active" }),
    // 문서에 찍을 지원자 이름. 연결된 이력서에 적어둔 이름을 먼저 쓴다.
    coverLetter.resumeId ? getResumeRepository().findById(coverLetter.resumeId) : Promise.resolve(null),
  ]);
  if (!detail) notFound();

  const applicantName = linkedResume?.name?.trim() || user.name?.trim() || undefined;

  return (
    // 입력칸이 흰색으로 도드라지도록 편집 화면만 회색 바탕을 깐다.
    <div className="min-h-screen bg-slate-100">
      {/* 하단 고정 액션 바(fixed)에 마지막 문항이 가려지지 않도록 아래 여백을 크게 둔다. */}
      <div className="mx-auto max-w-5xl px-6 pb-28 pt-10 lg:px-8">
        <CoverLetterEditor
          initialDetail={detail}
          experienceBank={experienceBank}
          catalog={buildQuestionCatalog(templates)}
          applicantName={applicantName}
        />
      </div>
    </div>
  );
}
