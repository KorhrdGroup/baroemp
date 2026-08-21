import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getResumeRepository, getResumeTemplateRepository } from "@/lib/repositories";
import { getResumeDetail } from "@/services/resume.service";
import { ResumeEditor } from "@/features/resume/resume-editor";

export const metadata: Metadata = {
  title: "이력서 편집 | 한평생 바로취업",
};

export default async function ResumeEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /** ?new=1 은 방금 만든 직후라는 표시. 양식 선택기를 펼쳐서 고르게 한다. */
  searchParams: Promise<{ new?: string }>;
}) {
  const [{ id }, { new: isNewParam }] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/resume/${id}/edit`);

  const resume = await getResumeRepository().findById(id);
  if (!resume || resume.userId !== user.id) notFound();

  // 양식 선택을 별도 Step으로 두지 않고 편집 화면 상단에서 바꿀 수 있게 목록을 함께 내려준다.
  const [detail, templates] = await Promise.all([
    getResumeDetail(id),
    getResumeTemplateRepository().findAll({ status: "active" }),
  ]);
  if (!detail) notFound();

  const templateOptions = [...templates]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((t) => ({ id: t.id, name: t.name, description: t.description }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <ResumeEditor initialDetail={detail} templates={templateOptions} isNew={isNewParam === "1"} />
    </div>
  );
}
