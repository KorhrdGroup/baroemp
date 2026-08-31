import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Briefcase, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { compareUserToJobsRequirements } from "@/services/job-requirement-comparison.service";
import { readinessFromComparison } from "@/features/jobs/job-readiness";
import { JobCard } from "@/features/jobs/job-card";
import { JobFiltersForm } from "@/features/jobs/job-filters-form";
import { JobCurationSection } from "@/features/jobs/job-curation-section";
import { Pagination } from "@/components/common/pagination";
import { getUserJobBookmarkIdsAction } from "@/features/jobs/job-actions";
import { searchJobs, getRecommendedJobsForAnonymous, type JobSearchParams } from "@/services/job-search.service";
import { getJobCuration } from "@/services/job-curation.service";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { getOccupationRepository } from "@/lib/repositories";
import type { JobSortOrder, Region } from "@/types";

export const metadata: Metadata = {
  title: "일자리 찾기 | 한평생 바로취업",
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
  const user = await requireUser(`/jobs${query ? `?${query}` : ""}`);

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

  const [result, recommendation, currentUser, bookmarkedIds, initialCuration] = await Promise.all([
    searchJobs(filter),
    getRecommendedJobsForAnonymous(anonymousId),
    getCurrentUser(),
    getUserJobBookmarkIdsAction(),
    getJobCuration(user.id, "new"),
  ]);
  const isAuthenticated = Boolean(currentUser);

  /*
   * 직업진단 결과에서 넘어오는 직종 코드는 검색바의 직종 목록에 없다.
   * 이름을 찾아 넘겨야 필터가 걸린 것을 버튼에서 알아볼 수 있다.
   */
  const jobCategoryLabel = sp.category
    ? (await getOccupationRepository().findAll()).find((o) => o.jobCategoryCode === sp.category)?.name
    : undefined;
  /*
    자격 배지용 요건 비교.
    공고 원문에서 필수 요건을 뽑아 회원 준비 상태와 맞춰본다. 요건 사전이 필요해
    카드 안에서는 못 만들고, 여기서 이 페이지에 그릴 공고만 한 번에 계산해 넘긴다.
  */
  const badgeJobs = [...result.items, ...(recommendation?.jobs ?? [])];
  const readinessMap = currentUser
    ? new Map(
        [...(await compareUserToJobsRequirements(currentUser.id, badgeJobs))].map(([jobId, items]) => [
          jobId,
          readinessFromComparison(items),
        ]),
      )
    : new Map();
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
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <div className="mb-8">
        <p className="text-label-1 font-semibold text-brand-blue-600">일자리찾기</p>
        <h1 className="mt-1 text-title-2 font-bold text-slate-900 sm:text-headline-3">나에게 맞는 일자리를 찾아보세요</h1>
        <p className="mt-2 text-body-2-reading text-balance text-slate-500">
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
        jobCategoryLabel={jobCategoryLabel}
        summary={
          <p className="text-body-2 text-slate-500">
            총 <span className="font-bold text-brand-blue-600">{result.total.toLocaleString()}건</span>
          </p>
        }
      >
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
                readiness={readinessMap.get(job.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <JobCurationSection
          initialNew={initialCuration}
          bookmarkedIds={bookmarkedIds}
        />
      </div>
      </JobFiltersForm>

      <div className="mt-4">
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
                  matchReasonLabel={job.match?.reasons[0]?.label}
                  isAuthenticated={isAuthenticated}
                  isBookmarked={bookmarkedSet.has(job.id)}
                  readiness={readinessMap.get(job.id)}
                />
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} buildHref={buildPageHref} className="mt-8" />
          </>
        )}
      </div>
    </div>
  );
}
