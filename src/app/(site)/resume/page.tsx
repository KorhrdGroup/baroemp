import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Pencil, Plus, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listResumesForUser } from "@/services/resume.service";
import { listCoverLettersForUser } from "@/services/cover-letter.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "이력서 Builder | 한평생 바로취업",
};

export default async function ResumeListPage() {
  const user = await requireUser("/resume");
  const [resumes, coverLetters] = await Promise.all([listResumesForUser(user.id), listCoverLettersForUser(user.id)]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold text-brand-blue-600">이력서 · 자기소개서</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">취업에 바로 사용할 이력서를 만들어보세요.</h1>
        <p className="mt-2 text-[15px] text-slate-500">
          내 경력/자격/희망직무 정보를 불러와 이력서를 빠르게 작성하고, AI 첨삭으로 다듬을 수 있어요.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/resume/new">
          <Button size="lg" className="h-12">
            <Plus className="size-4" /> 새 이력서 만들기
          </Button>
        </Link>
        <Link href="/cover-letter">
          <Button size="lg" variant="outline" className="h-12">
            <Sparkles className="size-4" /> 자기소개서 관리
          </Button>
        </Link>
        <Link href="/experience-bank">
          <Button size="lg" variant="ghost" className="h-12">
            경험뱅크 관리
          </Button>
        </Link>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-bold text-slate-900">내 이력서 ({resumes.length})</h2>
        {resumes.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-white p-10 text-center">
            <FileText className="mx-auto size-8 text-slate-300" />
            <p className="mt-3 text-[14px] text-slate-500">아직 작성한 이력서가 없어요. 새 이력서를 만들어보세요.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {resumes.map((resume) => (
              <Link
                key={resume.id}
                href={`/resume/${resume.id}/edit`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-5 transition-colors hover:border-brand-blue-300 hover:bg-brand-blue-50/30"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-base font-semibold text-slate-900">{resume.title}</p>
                    {resume.isPrimary && <Badge className="rounded-full bg-brand-blue-500 text-[11px]">대표</Badge>}
                    <Badge variant="outline" className="rounded-full text-[11px]">
                      {resume.status === "completed" ? "완성" : resume.status === "archived" ? "보관" : "작성중"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[13px] text-slate-400">
                    {resume.desiredJobTitle ? `희망직무 ${resume.desiredJobTitle} · ` : ""}
                    최근수정 {new Date(resume.updatedAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-brand-blue-600">완성도 {resume.completeness}%</span>
                  <Pencil className="size-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-bold text-slate-900">내 자기소개서 ({coverLetters.length})</h2>
        {coverLetters.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-white p-8 text-center">
            <p className="text-[14px] text-slate-500">아직 작성한 자기소개서가 없어요.</p>
            <Link href="/cover-letter/new" className="mt-3 inline-block text-[13px] font-semibold text-brand-blue-600 hover:underline">
              자기소개서 작성하기 →
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {coverLetters.map((cl) => (
              <Link
                key={cl.id}
                href={`/cover-letter/${cl.id}/edit`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-5 transition-colors hover:border-brand-blue-300 hover:bg-brand-blue-50/30"
              >
                <div>
                  <p className="text-base font-semibold text-slate-900">{cl.title}</p>
                  <p className="mt-1 text-[13px] text-slate-400">최근수정 {new Date(cl.updatedAt).toLocaleDateString("ko-KR")}</p>
                </div>
                <Pencil className="size-4 text-slate-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
