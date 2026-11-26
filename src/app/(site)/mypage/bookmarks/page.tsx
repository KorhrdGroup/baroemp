import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Gift } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/features/jobs/job-card";
import { SupportProgramCard } from "@/features/support/support-program-card";
import { getUserJobBookmarkIdsAction } from "@/features/jobs/job-actions";
import { getUserSupportBookmarkIdsAction } from "@/features/support/support-actions";
import { getJobRepository, getSupportProgramRepository } from "@/lib/repositories";
import { requireUser } from "@/lib/auth/session";
import type { Job, SupportProgram } from "@/types";
import { PageHead } from "@/components/layout/page-head";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "찜한 목록 | 한평생 바로취업",
};

type BookmarkTab = "jobs" | "support";

/**
 * 찜한 일자리·지원금 전체 목록.
 *
 * 마이페이지 카드에는 앞의 몇 건만 보여주므로 전체를 볼 자리가 없었다.
 * 둘 다 회원에게는 "찜해둔 것"이라 한 화면에 두되, 탭으로 나눠 한 번에 한 가지만 보인다 -
 * 위아래로 이어 두었더니 "일자리 찜하기"로 들어온 회원이 지원금 카드까지 일자리로 읽었다.
 * 탭은 주소(?tab=support)로 고른다. 없으면 일자리 탭이다.
 */
export default async function BookmarksPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab: BookmarkTab = (await searchParams).tab === "support" ? "support" : "jobs";
  // 찜 목록은 액션이 로그인 사용자 기준으로만 읽으므로, 여기서는 로그인만 확인한다.
  await requireUser("/mypage/bookmarks");

  const [jobIds, supportIds] = await Promise.all([
    getUserJobBookmarkIdsAction(),
    getUserSupportBookmarkIdsAction(),
  ]);

  const [jobs, programs] = await Promise.all([
    Promise.all(jobIds.map((id) => getJobRepository().findById(id))),
    Promise.all(supportIds.map((id) => getSupportProgramRepository().findById(id))),
  ]);

  const bookmarkedJobs = jobs.filter((job): job is Job => Boolean(job));
  const bookmarkedPrograms = programs.filter((program): program is SupportProgram => Boolean(program));

  return (
    // 흰 머리 아래 회색 바탕에 흰 카드(테두리 · 그림자 없음). /draft3 색 구성 (globals.css .draft3-theme).
    // "마이페이지"로 돌아가는 길은 머리의 현재 위치(홈 › 마이페이지 › 찜한 목록)가 맡는다.
    <div className="draft3-theme">
    <PageHead
      crumbs={[{ label: "마이페이지", href: "/mypage" }, { label: "찜한 목록" }]}
      title="찜한 목록"
      description="일자리와 지원금에서 찜해두신 것을 모았어요."
    />
    <div className="bg-baro-page">
    <div className="mx-auto max-w-7xl px-4.5 pt-10 pb-20 lg:px-8">
      {/* 고른 탭만 남색 밑줄 · 굵은 글자, 개수는 파랑. 탭을 바꿔도 화면이 위로 튀지 않게 scroll={false}. */}
      <nav aria-label="찜한 종류" className="mb-6 flex gap-7 border-b border-slate-200">
        {(
          [
            { key: "jobs", label: "일자리", count: bookmarkedJobs.length, href: "/mypage/bookmarks" },
            { key: "support", label: "지원금", count: bookmarkedPrograms.length, href: "/mypage/bookmarks?tab=support" },
          ] as const
        ).map((t) => {
          const on = tab === t.key;
          return (
            <Link
              key={t.key}
              href={t.href}
              replace
              scroll={false}
              aria-current={on ? "page" : undefined}
              className={cn(
                "-mb-px flex h-14 items-center gap-2 border-b-[3px] px-1 text-title-3",
                on ? "border-baro-navy font-extrabold text-slate-900" : "border-transparent font-semibold text-slate-600",
              )}
            >
              {t.label}
              <span className={cn("text-body-1 font-bold", on ? "text-baro-blue-600" : "text-slate-600")}>{t.count}</span>
            </Link>
          );
        })}
      </nav>

      {tab === "jobs" ? (
        bookmarkedJobs.length === 0 ? (
          <EmptyState
            className="rounded-card border-0 bg-white"
            icon={Briefcase}
            title="아직 찜한 일자리가 없어요"
            description="마음에 드는 일자리를 찜해두면 여기 모입니다."
            action={
              <Button className="h-12 rounded-xl bg-atomic-blue-600 px-5 text-body-2 font-bold text-white" asChild>
                <Link href="/jobs">일자리 찾아보기</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bookmarkedJobs.map((job) => (
              <JobCard key={job.id} job={job} isAuthenticated isBookmarked />
            ))}
          </div>
        )
      ) : bookmarkedPrograms.length === 0 ? (
          <EmptyState
            className="rounded-card border-0 bg-white"
            icon={Gift}
            title="아직 찜한 지원금이 없어요"
            description="받을 수 있는 지원금을 찾아 찜해두면 여기 모입니다."
            action={
              <Button className="h-12 rounded-xl bg-atomic-blue-600 px-5 text-body-2 font-bold text-white" asChild>
                <Link href="/support">지원금 찾아보기</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bookmarkedPrograms.map((program) => (
              <SupportProgramCard key={program.id} program={program} isAuthenticated isBookmarked />
            ))}
          </div>
        )}
    </div>
    </div>
    </div>
  );
}
