import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Briefcase, Gift } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/features/jobs/job-card";
import { SupportProgramCard } from "@/features/support/support-program-card";
import { getUserJobBookmarkIdsAction } from "@/features/jobs/job-actions";
import { getUserSupportBookmarkIdsAction } from "@/features/support/support-actions";
import { getJobRepository, getSupportProgramRepository } from "@/lib/repositories";
import { requireUser } from "@/lib/auth/session";
import type { Job, SupportProgram } from "@/types";

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
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-20 sm:px-6 lg:px-8">
      <Button variant="ghost" size="sm" className="-ml-2 text-slate-500" asChild>
        <Link href="/mypage">
          <ArrowLeft className="size-4" /> 마이페이지
        </Link>
      </Button>
      <h1 className="mt-2 text-title-2 font-bold text-slate-900 sm:text-headline-3">찜한 목록</h1>
      <p className="mt-2 text-body-2-reading text-slate-500">
        일자리와 지원제도에서 찜해두신 것을 모두 모았어요.
      </p>

      {/* 마이페이지 카드의 더보기가 각각 이 자리로 데려온다. 헤더에 가리지 않게 여백을 둔다. */}
      <section id="jobs" className="mt-10 scroll-mt-24">
        <h2 className="mb-4 text-body-1 font-bold text-slate-900">찜한 일자리 ({bookmarkedJobs.length})</h2>
        {bookmarkedJobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="아직 찜한 일자리가 없어요"
            description="마음에 드는 일자리를 찜해두면 여기 모입니다."
            action={
              <Button asChild>
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
        <h2 className="mb-4 text-body-1 font-bold text-slate-900">
          찜한 지원제도 ({bookmarkedPrograms.length})
        </h2>
        {bookmarkedPrograms.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="아직 찜한 지원제도가 없어요"
            description="받을 수 있는 지원금을 찾아 찜해두면 여기 모입니다."
            action={
              <Button asChild>
                <Link href="/support">지원금 찾아보기</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {bookmarkedPrograms.map((program) => (
              <SupportProgramCard key={program.id} program={program} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
