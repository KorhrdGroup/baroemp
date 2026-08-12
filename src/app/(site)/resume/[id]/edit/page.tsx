import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getResumeRepository } from "@/lib/repositories";
import { getResumeDetail } from "@/services/resume.service";
import { ResumeEditor } from "@/features/resume/resume-editor";

export const metadata: Metadata = {
  title: "이력서 편집 | 한평생 바로취업",
};

export default async function ResumeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/resume/${id}/edit`);

  const resume = await getResumeRepository().findById(id);
  if (!resume || resume.userId !== user.id) notFound();

  const detail = await getResumeDetail(id);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <ResumeEditor initialDetail={detail} />
    </div>
  );
}
