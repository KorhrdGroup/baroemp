import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Pencil, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listResumesForUser } from "@/services/resume.service";
import { listCoverLettersForUser } from "@/services/cover-letter.service";
import { listExperienceBankForUser } from "@/services/experience-bank.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "이력서 Builder | 한평생 바로취업",
};

/**
 * 섹션 제목 + 우측 액션 버튼.
 * 이력서/자기소개서/경험뱅크를 같은 위계로 두고, 각 섹션의 액션을 제목 옆에 붙인다.
 */
function SectionHeader({
  title,
  count,
  action,
}: {
  title: string;
  count: number;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-body-1 font-bold text-slate-900">
        {title} ({count})
      </h2>
      {action}
    </div>
  );
}

export default async function ResumeListPage() {
  const user = await requireUser("/resume");
  const [resumes, coverLetters, experiences] = await Promise.all([
    listResumesForUser(user.id),
    listCoverLettersForUser(user.id),
    listExperienceBankForUser(user.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-label-1 font-semibold text-brand-blue-600">이력서 · 자기소개서</p>
        <h1 className="mt-1 text-title-2 font-bold text-slate-900 sm:text-headline-3">취업에 바로 사용할 이력서를 만들어보세요.</h1>
        <p className="mt-2 text-body-2-reading text-slate-500">
          내 경력/자격/희망직무 정보를 불러와 이력서를 빠르게 작성하고, AI 첨삭으로 다듬을 수 있어요.
        </p>
      </div>

      <div>
        <SectionHeader
          title="내 이력서"
          count={resumes.length}
          action={
            <Button asChild>
              <Link href="/resume/new">
                <Plus className="size-4" /> 새 이력서 만들기
              </Link>
            </Button>
          }
        />
        {resumes.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-white p-10 text-center">
            <FileText className="mx-auto size-8 text-slate-300" />
            <p className="mt-3 text-label-1 text-slate-500">아직 작성한 이력서가 없어요. 새 이력서를 만들어보세요.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {resumes.map((resume) => (
              <Link
                key={resume.id}
                href={`/resume/${resume.id}/edit`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-5 transition-colors hover:border-brand-blue-300 hover:bg-brand-blue-50/30"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-body-2 font-semibold text-slate-900">{resume.title}</p>
                    {resume.isPrimary && <Badge className="rounded-full bg-brand-blue-400 text-label-2">대표</Badge>}
                    <Badge variant="outline" className="rounded-full text-label-2">
                      {resume.status === "completed" ? "완성" : resume.status === "archived" ? "보관" : "작성중"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-label-1 text-slate-400">
                    {resume.desiredJobTitle ? `희망직무 ${resume.desiredJobTitle} · ` : ""}
                    최근수정 {new Date(resume.updatedAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-label-1 font-bold text-brand-blue-600">완성도 {resume.completeness}%</span>
                  <Pencil className="size-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <SectionHeader
          title="내 자기소개서"
          count={coverLetters.length}
          action={
            <Button variant="outline" asChild>
              <Link href="/cover-letter/new">
                <Plus className="size-4" /> 새 자기소개서 만들기
              </Link>
            </Button>
          }
        />
        {coverLetters.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-white p-8 text-center">
            <p className="text-label-1 text-slate-500">아직 작성한 자기소개서가 없어요.</p>
            <Link href="/cover-letter/new" className="mt-3 inline-block text-label-1 font-semibold text-brand-blue-600 hover:underline">
              자기소개서 작성하기 →
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {coverLetters.map((cl) => (
              <Link
                key={cl.id}
                href={`/cover-letter/${cl.id}/edit`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-5 transition-colors hover:border-brand-blue-300 hover:bg-brand-blue-50/30"
              >
                <div>
                  <p className="text-body-2 font-semibold text-slate-900">{cl.title}</p>
                  <p className="mt-1 text-label-1 text-slate-400">최근수정 {new Date(cl.updatedAt).toLocaleDateString("ko-KR")}</p>
                </div>
                <Pencil className="size-4 text-slate-400" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <SectionHeader
          title="내 경험뱅크"
          count={experiences.length}
          action={
            <Button variant="outline" asChild>
              <Link href="/experience-bank">
                <Plus className="size-4" /> 내 경험 추가하기
              </Link>
            </Button>
          }
        />
        {experiences.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-white p-8 text-center">
            <p className="text-label-1 text-slate-500">
              아직 저장한 경험이 없어요. 미리 정리해두면 자기소개서 문항마다 골라 쓸 수 있어요.
            </p>
            <Link href="/experience-bank" className="mt-3 inline-block text-label-1 font-semibold text-brand-blue-600 hover:underline">
              경험 정리하러 가기 →
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {experiences.map((item) => (
              <Link
                key={item.id}
                href="/experience-bank"
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-5 transition-colors hover:border-brand-blue-300 hover:bg-brand-blue-50/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-body-2 font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-label-1 text-slate-400">
                    {item.skills.length > 0 ? `${item.skills.slice(0, 3).join(" · ")} · ` : ""}
                    최근수정 {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <Pencil className="size-4 shrink-0 text-slate-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
