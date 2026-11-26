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
import { sectionCountClass } from "@/lib/ui-classes";
import { PageHead } from "@/components/layout/page-head";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "찜한 목록 | 한평생 바로취업",
};

/**
 * 찜한 일자리·지원제도 전체 목록.
 *
 * 마이페이지 카드에는 앞의 몇 건만 보여주므로 전체를 볼 자리가 없었다.
 * 일자리와 지원제도를 한 화면에 두는 이유는 회원에게는 둘 다 "찜해둔 것"이기 때문이다.
 * 마이페이지의 두 카드가 각각 이 화면의 제 자리로 데려온다.
 */
export default async function BookmarksPage() {
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
      description="일자리와 지원제도에서 찜해두신 것을 모두 모았어요."
    />
    <div className="bg-baro-page">
    <div className="mx-auto max-w-6xl px-4.5 pt-10 pb-20 lg:px-8">
      {/* 마이페이지 카드의 더보기가 각각 이 자리로 데려온다. 헤더에 가리지 않게 여백을 둔다. */}
      <section id="jobs" className="scroll-mt-24">
        <h2 className="mb-4 text-title-3 font-extrabold text-slate-900">
          찜한 일자리<span className={cn(sectionCountClass, "text-slate-600")}>{bookmarkedJobs.length}</span>
        </h2>
        {bookmarkedJobs.length === 0 ? (
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {bookmarkedJobs.map((job) => (
              <JobCard key={job.id} job={job} isAuthenticated isBookmarked />
            ))}
          </div>
        )}
      </section>

      <section id="support" className="mt-16 scroll-mt-24">
        <h2 className="mb-4 text-title-3 font-extrabold text-slate-900">
          찜한 지원제도<span className={cn(sectionCountClass, "text-slate-600")}>{bookmarkedPrograms.length}</span>
        </h2>
        {bookmarkedPrograms.length === 0 ? (
          <EmptyState
            className="rounded-card border-0 bg-white"
            icon={Gift}
            title="아직 찜한 지원제도가 없어요"
            description="받을 수 있는 지원금을 찾아 찜해두면 여기 모입니다."
            action={
              <Button className="h-12 rounded-xl bg-atomic-blue-600 px-5 text-body-2 font-bold text-white" asChild>
                <Link href="/support">지원금 찾아보기</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {bookmarkedPrograms.map((program) => (
              <SupportProgramCard key={program.id} program={program} isAuthenticated isBookmarked />
            ))}
          </div>
        )}
      </section>
    </div>
    </div>
    </div>
  );
}
