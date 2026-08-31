import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { interactiveCardClass } from "@/lib/ui-classes";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listCoverLettersForUser } from "@/services/cover-letter.service";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "자기소개서 Builder | 한평생 바로취업",
};

export default async function CoverLetterListPage() {
  const user = await requireUser("/cover-letter");
  const coverLetters = await listCoverLettersForUser(user.id);

  return (
    <div className="mx-auto max-w-6xl px-4.5 py-10 lg:px-8">
      <div className="mb-8">
        <p className="text-label-1 font-semibold text-brand-blue-600">자기소개서</p>
        <h1 className="mt-1 text-title-2 font-bold text-slate-900 sm:text-headline-3">나만의 자기소개서를 작성해보세요.</h1>
        <p className="mt-2 text-body-2-reading text-balance text-slate-500">문항을 자유롭게 추가/삭제/순서변경하고, AI 초안/첨삭을 받아보세요.</p>
      </div>

      <Link href="/cover-letter/new">
        <Button size="lg" className="h-12">
          <Plus className="size-4" /> 새 자기소개서 작성
        </Button>
      </Link>

      <div className="mt-10 space-y-3">
        {coverLetters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center">
            <p className="text-label-1 text-slate-500">아직 작성한 자기소개서가 없어요.</p>
          </div>
        ) : (
          coverLetters.map((cl) => (
            <Link
              key={cl.id}
              href={`/cover-letter/${cl.id}/edit`}
              className={cn("flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-5", interactiveCardClass)}
            >
              <div>
                <p className="text-body-2 font-semibold text-slate-900">{cl.title}</p>
                <p className="mt-1 text-label-1 text-slate-400">최근수정 {new Date(cl.updatedAt).toLocaleDateString("ko-KR")}</p>
              </div>
              <Pencil className="size-4 text-slate-400" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
