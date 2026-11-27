import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listCoverLettersForUser } from "@/services/cover-letter.service";
import { Button } from "@/components/ui/button";
import { PageHead } from "@/components/layout/page-head";

export const metadata: Metadata = {
  title: "자기소개서 Builder | 한평생 바로취업",
};

export default async function CoverLetterListPage() {
  const user = await requireUser("/cover-letter");
  const coverLetters = await listCoverLettersForUser(user.id);

  return (
    // 흰 머리 아래 회색 바탕에 흰 카드(테두리 · 그림자 없음). /draft3 색 구성 (globals.css .draft3-theme).
    <div className="draft3-theme page-fill flex flex-1 flex-col">
      <PageHead icon="coverLetter"
        crumbs={[{ label: "자기소개서" }]}
        title="자기소개서"
        description="문항을 자유롭게 추가/삭제/순서변경하고, AI 초안/첨삭을 받아보세요."
      >
        <Button asChild className="h-12 shrink-0 rounded-xl bg-atomic-blue-600 px-5 text-body-2 font-semibold text-white">
          <Link href="/cover-letter/new">
            <Plus className="size-4" /> 새 자기소개서 작성
          </Link>
        </Button>
      </PageHead>

      <div className="flex-1 bg-baro-page">
      <div className="mx-auto max-w-7xl px-4.5 pt-10 pb-20 lg:px-8">
        <div className="space-y-3">
          {coverLetters.length === 0 ? (
            <div className="rounded-card bg-white p-10 text-center">
              <p className="text-body-3 font-medium text-slate-600">아직 작성한 자기소개서가 없어요.</p>
            </div>
          ) : (
            coverLetters.map((cl) => (
              <Link
                key={cl.id}
                href={`/cover-letter/${cl.id}/edit`}
                className="flex items-center justify-between gap-3 rounded-card bg-white p-5 transition-shadow duration-200 hover:shadow-hover"
              >
                <div>
                  <p className="text-body-2 font-semibold text-slate-900">{cl.title}</p>
                  <p className="mt-1 text-body-3 font-medium text-slate-600">최근수정 {new Date(cl.updatedAt).toLocaleDateString("ko-KR")}</p>
                </div>
                <Pencil className="size-4 text-slate-400" />
              </Link>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
