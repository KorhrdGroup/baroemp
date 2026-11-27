import type { Metadata } from "next";
import Link from "next/link";
import { FileText, PenLine, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { sectionCountClass } from "@/lib/ui-classes";
import { requireUser } from "@/lib/auth/session";
import { listResumesForUser, MAX_RESUMES_PER_USER, RESUME_LIMIT_MESSAGE } from "@/services/resume.service";
import {
  COVER_LETTER_LIMIT_MESSAGE,
  listCoverLettersForUser,
  MAX_COVER_LETTERS_PER_USER,
} from "@/services/cover-letter.service";
import { listExperienceBankForUser } from "@/services/experience-bank.service";
import { ExperienceBankSection } from "@/features/experience-bank/experience-bank-section";
import { DocumentMenu } from "@/components/common/document-menu";
import { deleteResumeAction, setPrimaryResumeAction } from "@/features/resume/resume-actions";
import { deleteCoverLetterAction } from "@/features/cover-letter/cover-letter-actions";
import { PageHead } from "@/components/layout/page-head";

export const metadata: Metadata = {
  title: "이력서 · 자기소개서 | 한평생 바로취업",
};

/*
  이력서 · 자기소개서 첫 화면. 목록 줄 대신 카드 격자.
  - 넓은 화면 3장 · 중간 2장(일자리 · 지원금 카드와 같은 수). 첫 칸은 "새로 만들기" 카드라 만들기 단추를 따로 찾지 않아도 된다.
    상한에 닿으면 그 카드를 잠그고 이유를 적는다 - 세 단계를 다 거친 뒤 마지막에 막히면 고른 것이 다 사라진다.
  - 미리보기 그림은 두지 않는다. 같은 종이 그림은 카드끼리 구별이 안 되고, 실제 내용을 넣으면 복잡했다. 제목 · 상태 · 완성도 막대만.
  - 완성도는 숫자 배지 대신 막대로 - 얼마나 남았는지가 길이로 읽힌다.
*/

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR");
}

function SectionHeader({ title, count, description }: { title: string; count: number; description?: string }) {
  return (
    <div className="min-w-0">
      <h2 className="text-title-3 font-bold text-slate-900">
        {title}
        <span className={cn(sectionCountClass, "text-slate-600")}>{count}</span>
      </h2>
      {description && <p className="mt-1 text-body-3 font-medium break-keep text-slate-600">{description}</p>}
    </div>
  );
}

/** 첫 칸의 새로 만들기 카드. 상한에 닿으면 잠그고 이유를 적는다. */
function NewCard({ href, label, hint, locked, lockedMessage }: { href: string; label: string; hint: string; locked: boolean; lockedMessage: string }) {
  const inner = (
    <>
      <span className="flex size-14 items-center justify-center rounded-full bg-baro-blue-50 text-baro-blue-600">
        <Plus className="size-6" strokeWidth={2.4} />
      </span>
      <span className="mt-4 text-body-1 font-semibold text-slate-900">{label}</span>
      <span className="mt-1 px-6 text-center text-body-3 font-medium break-keep text-slate-600">
        {locked ? lockedMessage : hint}
      </span>
    </>
  );
  const cls =
    "flex min-h-[12rem] flex-col items-center justify-center rounded-card border-2 border-dashed border-slate-300 bg-white";
  return locked ? (
    <div aria-disabled className={cn(cls, "opacity-60")}>{inner}</div>
  ) : (
    <Link href={href} className={cls}>{inner}</Link>
  );
}

export default async function ResumeListPage() {
  const user = await requireUser("/resume");
  const [resumes, coverLetters, experiences] = await Promise.all([
    listResumesForUser(user.id),
    listCoverLettersForUser(user.id),
    listExperienceBankForUser(user.id),
  ]);
  const resumeAtLimit = resumes.length >= MAX_RESUMES_PER_USER;
  const coverLetterAtLimit = coverLetters.length >= MAX_COVER_LETTERS_PER_USER;

  return (
    <div className="draft3-theme page-gray">
      <PageHead
        icon="resume"
        crumbs={[{ label: "이력서" }]}
        title="이력서 · 자기소개서"
        description="내 경력 · 자격 · 희망 직무를 불러와 이력서를 빠르게 작성하고, AI 첨삭으로 다듬을 수 있어요."
      />
      <div className="bg-baro-page">
        <div className="mx-auto max-w-7xl px-4.5 pt-10 pb-20 lg:px-8">
          <SectionHeader
            title="내 이력서"
            count={resumes.length}
            /* 대표가 무엇인지는 배지만 봐서는 모른다. 고를 수 있는 상황(2개 이상)에서만 한 줄로 알려준다. */
            description={resumes.length > 1 ? "대표 이력서가 맨 앞에 와요. 진단과 상담에서는 이 이력서를 봐요." : undefined}
          />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NewCard href="/resume/new" label="새 이력서 만들기" hint="내 정보를 불러와 빠르게 시작해요" locked={resumeAtLimit} lockedMessage={RESUME_LIMIT_MESSAGE} />
            {resumes.map((r) => {
              const done = r.completeness >= 100;
              return (
                <Link key={r.id} href={`/resume/${r.id}/edit`} className="relative flex flex-col rounded-card bg-white p-5 sm:min-h-[12rem] transition-shadow duration-200 hover:shadow-hover">
                                    <div className="absolute top-4 right-4">
                    <DocumentMenu
                      label="이력서"
                      title={r.title}
                      editHref={`/resume/${r.id}/edit`}
                      isPrimary={r.isPrimary}
                      onSetPrimary={async () => {
                        "use server";
                        await setPrimaryResumeAction(r.id);
                      }}
                      onDelete={async () => {
                        "use server";
                        await deleteResumeAction(r.id);
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {r.isPrimary && (
                      <span className="rounded-full bg-baro-blue px-2.5 py-0.5 text-caption-1 font-semibold text-white">대표</span>
                    )}
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-caption-1 font-semibold text-slate-700">
                      {r.status === "completed" ? "완성" : r.status === "archived" ? "보관" : "작성중"}
                    </span>
                  </div>
                  <h3 className={cn("mt-2 line-clamp-2 pr-2 text-body-1 leading-snug font-semibold break-keep", r.title ? "text-slate-900" : "text-slate-600")}>
                    {r.title || "제목 없는 이력서"}
                  </h3>
                  <p className="mt-1 truncate text-body-3 font-medium text-slate-600">
                    {r.desiredJobTitle ? `${r.desiredJobTitle} · ` : ""}
                    {fmt(r.updatedAt)} 수정
                  </p>
                  <div className="mt-auto pt-4">
                    <div className="flex items-center justify-between text-caption-1 font-semibold">
                      <span className="text-slate-600">완성도</span>
                      <span className={done ? "text-baro-blue-600" : "text-slate-700"}>{r.completeness}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-baro-blue" style={{ width: `${Math.min(100, r.completeness)}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div id="cover-letters" className="mt-16 scroll-mt-24">
            <SectionHeader
              title="내 자기소개서"
              count={coverLetters.length}
              description="아래 경험뱅크에 정리해둔 경험을 문항마다 골라 넣어 작성할 수 있어요."
            />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <NewCard
                href="/cover-letter/new"
                label="새 자기소개서 만들기"
                hint="경험뱅크에서 경험을 골라 문항을 채워요"
                locked={coverLetterAtLimit}
                lockedMessage={COVER_LETTER_LIMIT_MESSAGE}
              />
              {coverLetters.map((cl) => (
                <Link key={cl.id} href={`/cover-letter/${cl.id}/edit`} className="relative flex flex-col rounded-card bg-white p-5 sm:min-h-[12rem] transition-shadow duration-200 hover:shadow-hover">
                                    <div className="absolute top-4 right-4">
                    <DocumentMenu
                      label="자기소개서"
                      title={cl.title}
                      editHref={`/cover-letter/${cl.id}/edit`}
                      onDelete={async () => {
                        "use server";
                        await deleteCoverLetterAction(cl.id);
                      }}
                    />
                  </div>
                  <h3 className={cn("line-clamp-2 pr-8 text-body-1 leading-snug font-semibold break-keep", cl.title ? "text-slate-900" : "text-slate-600")}>
                    {cl.title || "제목 없는 자기소개서"}
                  </h3>
                  <p className="mt-1 text-body-3 font-medium text-slate-600">{fmt(cl.updatedAt)} 수정</p>
                  <p className="mt-auto flex items-center gap-1.5 pt-4 text-body-3 font-semibold text-baro-blue-600">
                    <PenLine className="size-4" />
                    이어서 쓰기
                  </p>
                </Link>
              ))}
            </div>
            {coverLetters.length === 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-body-3 font-medium text-slate-600">
                <FileText className="size-4" />
                경험뱅크를 먼저 채워두면 문항 작성이 훨씬 빨라요.
              </p>
            )}
            <ExperienceBankSection initialItems={experiences} nested />
          </div>
        </div>
      </div>
    </div>
  );
}
