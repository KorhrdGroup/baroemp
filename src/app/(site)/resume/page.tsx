import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { interactiveCardClass } from "@/lib/ui-classes";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import {
  listResumesForUser,
  MAX_RESUMES_PER_USER,
  RESUME_LIMIT_MESSAGE,
} from "@/services/resume.service";
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
  description,
  action,
}: {
  title: string;
  count: number;
  /** 섹션끼리의 관계를 설명해야 할 때만 쓴다. */
  description?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-body-1 font-bold text-slate-900">
          {title} ({count})
        </h2>
        {description && <p className="mt-1 text-label-1 text-slate-500">{description}</p>}
      </div>
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

  /*
    상한에 닿으면 만들기 버튼을 잠근다. 눌러서 세 단계를 다 거친 뒤 마지막에 막히면
    그때까지 고른 것이 다 사라진다. 들어가기 전에 알려준다.
  */
  const resumeAtLimit = resumes.length >= MAX_RESUMES_PER_USER;
  const coverLetterAtLimit = coverLetters.length >= MAX_COVER_LETTERS_PER_USER;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-20 sm:px-6 lg:px-8">
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
          /*
            대표가 무엇인지는 배지만 봐서는 모른다. 고를 수 있는 상황(2개 이상)에서만
            한 줄로 알려준다. 상한에 닿았을 때는 그쪽이 더 급한 말이라 자리를 내준다.
          */
          description={
            resumeAtLimit
              ? RESUME_LIMIT_MESSAGE
              : resumes.length > 1
                ? "대표 이력서 하나가 맨 위에 올라오고, 진단과 상담에서는 이 이력서를 봐요."
                : undefined
          }
          action={
            resumeAtLimit ? (
              <Button disabled>
                <Plus className="size-4" /> 새 이력서 만들기
              </Button>
            ) : (
              <Button className="bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
                <Link href="/resume/new">
                  <Plus className="size-4" /> 새 이력서 만들기
                </Link>
              </Button>
            )
          }
        />
        {resumes.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-white p-10 text-center">
            <FileText className="mx-auto size-8 text-slate-300" />
            <p className="mt-3 text-label-1 text-slate-500">아직 작성한 이력서가 없어요.</p>
            <Link
              href="/resume/new"
              className="mt-3 inline-block text-label-1 font-semibold text-brand-blue-600 hover:underline"
            >
              이력서 작성하기 →
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {resumes.map((resume) => (
              <Link
                key={resume.id}
                href={`/resume/${resume.id}/edit`}
                className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-5", interactiveCardClass)}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("truncate text-body-2 font-semibold", resume.title ? "text-slate-900" : "text-slate-400")}>
                      {resume.title || "제목 없는 이력서"}
                    </p>
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
                  {/*
                    완성도는 다 채웠을 때만 색을 준다. 파란 글자로 늘 띄워두면 20%도 성과처럼 읽혀,
                    아직 할 일이 남았다는 신호가 되지 않는다.
                  */}
                  <Badge
                    className={cn(
                      "rounded-full text-label-2",
                      resume.completeness >= 100
                        ? "bg-brand-blue-50 text-brand-blue-700"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    완성도 {resume.completeness}%
                  </Badge>
                  <DocumentMenu
                    label="이력서"
                    title={resume.title}
                    editHref={`/resume/${resume.id}/edit`}
                    isPrimary={resume.isPrimary}
                    onSetPrimary={async () => {
                      "use server";
                      await setPrimaryResumeAction(resume.id);
                    }}
                    onDelete={async () => {
                      "use server";
                      await deleteResumeAction(resume.id);
                    }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 이력서와 자기소개서는 별개의 묶음이라 섹션 사이를 넉넉히 띄운다. */}
      <div className="mt-16">
        <SectionHeader
          title="내 자기소개서"
          count={coverLetters.length}
          description={
            coverLetterAtLimit
              ? COVER_LETTER_LIMIT_MESSAGE
              : "아래 경험뱅크에 정리해둔 경험을 문항마다 골라 넣어 작성할 수 있어요."
          }
          action={
            coverLetterAtLimit ? (
              <Button disabled>
                <Plus className="size-4" /> 새 자기소개서 만들기
              </Button>
            ) : (
              <Button className="bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
                <Link href="/cover-letter/new">
                  <Plus className="size-4" /> 새 자기소개서 만들기
                </Link>
              </Button>
            )
          }
        />
        {coverLetters.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-white p-8 text-center">
            <p className="text-label-1 text-slate-500">
              아직 작성한 자기소개서가 없어요. 경험뱅크를 먼저 채워두면 문항 작성이 훨씬 빨라요.
            </p>
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
                className={cn("flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-5", interactiveCardClass)}
              >
                <div>
                  <p className={cn("truncate text-body-2 font-semibold", cl.title ? "text-slate-900" : "text-slate-400")}>
                    {cl.title || "제목 없는 자기소개서"}
                  </p>
                  <p className="mt-1 text-label-1 text-slate-400">최근수정 {new Date(cl.updatedAt).toLocaleDateString("ko-KR")}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
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
              </Link>
            ))}
          </div>
        )}

        {/*
          경험뱅크는 자기소개서를 쓰기 위한 재료다. 별도 섹션으로 떼어놓으면 관계가 안 읽혀서
          자기소개서 묶음 안에 들여 넣는다. 추가/수정은 모달, 삭제는 목록에서 바로 처리하므로
          클라이언트 컴포넌트가 이 블록 전체를 그린다.
        */}
        <ExperienceBankSection initialItems={experiences} nested />
      </div>
    </div>
  );
}
