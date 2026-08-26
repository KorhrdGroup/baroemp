import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Briefcase, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { JobCard } from "@/features/jobs/job-card";
import { JobFiltersForm } from "@/features/jobs/job-filters-form";
import { getUserJobBookmarkIdsAction } from "@/features/jobs/job-actions";
import { searchJobs, getRecommendedJobsForAnonymous, type JobSearchParams } from "@/services/job-search.service";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { getUserQualificationRepository } from "@/lib/repositories";
import type { JobSortOrder, Region } from "@/types";

export const metadata: Metadata = {
  title: "전국 채용공고 | 한평생 바로취업",
};

const PAGE_SIZE = 10;

interface JobsPageSearchParams {
  keyword?: string;
  region?: string;
  category?: string;
  beginner?: string;
  closingSoon?: string;
  sort?: string;
  page?: string;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<JobsPageSearchParams>;
}) {
  const sp = await searchParams;
  // 로그인해야 이용할 수 있는 화면이다. 로그인 후 보던 조건 그대로 돌아오도록 쿼리까지 next에 싣는다.
  const query = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => typeof v === "string" && v !== "") as [string, string][],
  ).toString();
  await requireUser(`/jobs${query ? `?${query}` : ""}`);

  const page = Math.max(1, Number(sp.page) || 1);

  const anonymousId = (await cookies()).get("baro_anonymous_id")?.value;

  const filter: JobSearchParams = {
    keyword: sp.keyword,
    region: sp.region as Region | undefined,
    jobCategory: sp.category,
    isBeginnerFriendly: sp.beginner === "1" ? true : undefined,
    closingWithinDays: sp.closingSoon === "1" ? 7 : undefined,
    sort: (sp.sort as JobSortOrder | undefined) ?? "recommended",
    activeOnly: true,
    page,
    pageSize: PAGE_SIZE,
    anonymousId,
  };

  const [result, recommendation, currentUser, bookmarkedIds] = await Promise.all([
    searchJobs(filter),
    getRecommendedJobsForAnonymous(anonymousId),
    getCurrentUser(),
    getUserJobBookmarkIdsAction(),
  ]);
  const isAuthenticated = Boolean(currentUser);
  // 취업준비성 배지용 보유 자격증 (이력서/검사에서 등록된 user_qualifications 기준)
  const heldQualifications = currentUser
    ? (await getUserQualificationRepository().findByUserId(currentUser.id)).map((q) => q.name)
    : undefined;
  const bookmarkedSet = new Set(bookmarkedIds);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (sp.keyword) params.set("keyword", sp.keyword);
    if (sp.region) params.set("region", sp.region);
    if (sp.category) params.set("category", sp.category);
    if (sp.beginner) params.set("beginner", sp.beginner);
    if (sp.closingSoon) params.set("closingSoon", sp.closingSoon);
    if (sp.sort) params.set("sort", sp.sort);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/jobs${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-label-1 font-semibold text-brand-blue-600">무료 서비스</p>
        <h1 className="mt-1 text-title-2 font-bold text-slate-900 sm:text-headline-3">나에게 맞는 일자리를 찾아보세요</h1>
        <p className="mt-2 text-body-2-reading text-slate-500">
          실시간 채용정보를 조건에 맞게 확인하고, 관심 있는 공고에 바로 지원해보세요.
        </p>
      </div>

      <JobFiltersForm
        initial={{
          keyword: sp.keyword,
          region: sp.region,
          jobCategory: sp.category,
          isBeginnerFriendly: sp.beginner === "1",
          closingSoon: sp.closingSoon === "1",
          sort: (sp.sort as JobSortOrder | undefined) ?? "recommended",
        }}
      />

      {recommendation && recommendation.jobs.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-brand-blue-600" />
            <h2 className="text-body-1 font-bold text-slate-900">
              검사 결과 기반 &ldquo;{recommendation.occupationName}&rdquo; 맞춤 공고
            </h2>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {recommendation.jobs.map((job) => (
              <JobCard
                key={`rec-${job.id}`}
                job={job}
                isAuthenticated={isAuthenticated}
                isBookmarked={bookmarkedSet.has(job.id)}
                heldQualifications={heldQualifications}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <p className="text-label-1 text-slate-500">
          총 <span className="font-semibold text-brand-blue-600">{result.total}건</span>의 채용공고
        </p>

        {result.items.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="조건에 맞는 채용공고가 없어요"
            description="검색어나 필터 조건을 조정해서 다시 확인해보세요."
            className="mt-4"
          />
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {result.items.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  matchScore={job.match?.score}
                  matchReasonLabel={job.match?.reasons[0]?.label}
                  isAuthenticated={isAuthenticated}
                  isBookmarked={bookmarkedSet.has(job.id)}
                  heldQualifications={heldQualifications}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Link
                  href={buildPageHref(Math.max(1, page - 1))}
                  aria-disabled={page <= 1}
                  className={`rounded-md border border-border px-4 py-2 text-label-1 font-medium ${
                    page <= 1 ? "pointer-events-none text-slate-300" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  이전
                </Link>
                <span className="text-label-1 text-slate-500">
                  {page} / {totalPages}
                </span>
                <Link
                  href={buildPageHref(Math.min(totalPages, page + 1))}
                  aria-disabled={page >= totalPages}
                  className={`rounded-md border border-border px-4 py-2 text-label-1 font-medium ${
                    page >= totalPages ? "pointer-events-none text-slate-300" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  다음
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
