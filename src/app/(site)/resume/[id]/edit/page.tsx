import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getResumeRepository, getResumeTemplateRepository } from "@/lib/repositories";
import { getResumeDetail } from "@/services/resume.service";
import { buildResumeSectionOptions } from "@/lib/resume/completeness";
import { ResumeEditor } from "@/features/resume/resume-editor";

export const metadata: Metadata = {
  title: "이력서 편집 | 한평생 바로취업",
};

export default async function ResumeEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/resume/${id}/edit`);

  const resume = await getResumeRepository().findById(id);
  if (!resume || resume.userId !== user.id) notFound();

  // AI 에이전트(=양식)는 편집 화면 상단에서 바꿀 수 있게 목록을 함께 내려준다.
  const [detail, templates] = await Promise.all([
    getResumeDetail(id),
    getResumeTemplateRepository().findAll({ status: "active" }),
  ]);
  if (!detail) notFound();

  const ordered = [...templates].sort((a, b) => a.orderIndex - b.orderIndex);
  const templateOptions = ordered.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    description: t.description,
  }));

  // 편집 중에도 항목을 넣고 뺄 수 있게, 작성 시작 화면과 같은 목록을 내려준다.
  const sectionOptions = buildResumeSectionOptions(ordered);

  return (
    // 입력칸이 흰색으로 도드라지도록 편집 화면만 회색 바탕을 깐다.
    <div className="min-h-screen bg-slate-100 print:min-h-0 print:bg-transparent">
      {/* 하단 고정 액션 바(fixed)에 마지막 카드가 가려지지 않도록 아래 여백을 크게 둔다. */}
      <div className="mx-auto max-w-5xl px-4.5 pb-28 pt-10 lg:px-8">
        <ResumeEditor initialDetail={detail} templates={templateOptions} sectionOptions={sectionOptions} />
      </div>
    </div>
  );
}
