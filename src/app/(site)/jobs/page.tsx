import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Briefcase, KeyRound } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { compareUserToJobsRequirements } from "@/services/job-requirement-comparison.service";
import { readinessFromComparison } from "@/features/jobs/job-readiness";
import { JobCard } from "@/features/jobs/job-card";
import { JobRowCompact } from "@/features/jobs/job-row-compact";
import { JobFiltersForm } from "@/features/jobs/job-filters-form";
import { JobCurationSection } from "@/features/jobs/job-curation-section";
import { Pagination } from "@/components/common/pagination";
import { getUserJobBookmarkIdsAction } from "@/features/jobs/job-actions";
import { searchJobs, type JobSearchParams } from "@/services/job-search.service";
import { getRecommendedJobsFromAssessment } from "@/services/assessment-job.service";
import { getJobCuration } from "@/services/job-curation.service";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { findCareerProfileByUserId, getOccupationRepository } from "@/lib/repositories";
import type { JobSortOrder, Region } from "@/types";
import { parseJobCategories, toJobCategoryPatterns } from "@/lib/jobs/job-category-groups";

export const metadata: Metadata = {
  title: "일자리 찾기 | 한평생 바로취업",
};

const PAGE_SIZE = 20;
/** "자격 따면 열리는" 섹션을 전체 공고 몇 개 뒤에 끼울지. */
const INTERLEAVE_AFTER = 6;

interface JobsPageSearchParams {
  keyword?: string;
  region?: string;
  /** 시·군·구. 지역 필터에서 시·도까지만 고르면 비어 있다. */
  sgg?: string;
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
  // 로그인 화면으로 보낼 때 보던 조건 그대로 돌아오도록 쿼리까지 next에 싣는다.
  const query = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => typeof v === "string" && v !== "") as [string, string][],
  ).toString();
  const nextPath = `/jobs${query ? `?${query}` : ""}`;

  const page = Math.max(1, Number(sp.page) || 1);

  /*
    첫 쪽은 로그인 없이 보여준다 - 어떤 공고가 있는지 못 보면 가입할 이유도 생기지 않는다.
    두 번째 쪽부터는 로그인을 요구한다. 회원용 값(맞춤 정렬·찜·자격 배지·큐레이션)은
    로그인한 경우에만 얹는다.
  */
  const user = page > 1 ? await requireUser(nextPath) : await getCurrentUser();

  const anonymousId = (await cookies()).get("baro_anonymous_id")?.value;

  /*
    전체 목록은 회원 조건을 안 보고 7만 건을 그대로 늘어놓아, 서울 희망인 회원에게 안성·부산 공고가 첫 줄에 왔다.
    지역을 고르지 않았으면 취업 프로필의 희망지역을 기본으로 건다. 회원이 "지역 전체"를 고르면
    검색바가 region=all 을 실어 보내 기본값을 되살리지 않는다 (job-filters-form.buildParams).
  */
  const careerProfile = user ? await findCareerProfileByUserId(user.id).catch(() => null) : null;
  const region: Region | undefined =
    sp.region === "all" ? undefined : ((sp.region as Region | undefined) ?? careerProfile?.region);

  const filter: JobSearchParams = {
    keyword: sp.keyword,
    region,
    /* 여러 구를 고르면 쉼표로 이어 온다. 시·군·구 이름에는 쉼표가 없다. */
    regionSigungus: sp.sgg ? sp.sgg.split(",").filter(Boolean) : undefined,
    /* 직종은 여러 개를 쉼표로 이어 온다. 묶음 이름은 코드 앞자리로, 6자리 코드는 그대로 쓴다. */
    jobCategoryPatterns: toJobCategoryPatterns(parseJobCategories(sp.category)),
    isBeginnerFriendly: sp.beginner === "1" ? true : undefined,
    closingWithinDays: sp.closingSoon === "1" ? 7 : undefined,
    sort: (sp.sort as JobSortOrder | undefined) ?? "recommended",
    activeOnly: true,
    page,
    pageSize: PAGE_SIZE,
    /* userId 가 빠져 있어 로그인 회원도 프로필 없는 셈으로 검색됐다 - 추천순이 회원 점수를 한 번도 안 탔던 이유. */
    userId: user?.id,
    anonymousId,
  };

  const [result, recommendation, bookmarkedIds, initialCuration] = await Promise.all([
    searchJobs(filter),
    user ? getRecommendedJobsFromAssessment({ userId: user.id, anonymousId }) : null,
    getUserJobBookmarkIdsAction(),
    // 큐레이션 섹션의 첫 화면에 뜨는 탭 (JobCurationSection 의 INITIAL_TAB 과 짝을 맞춰야 한다).
    user ? getJobCuration(user.id, "matched") : null,
  ]);
  const currentUser = user;
  const isAuthenticated = Boolean(currentUser);

  /*
   * 직업진단 결과에서 넘어오는 직종 코드는 검색바의 직종 목록에 없다.
   * 이름을 찾아 넘겨야 필터가 걸린 것을 버튼에서 알아볼 수 있다.
   */
  const firstCategory = parseJobCategories(sp.category)[0];
  const jobCategoryLabel = firstCategory
    ? (await getOccupationRepository().findAll()).find((o) => o.jobCategoryCode === firstCategory)?.name
    : undefined;
  /*
    자격 배지용 요건 비교.
    공고 원문에서 필수 요건을 뽑아 회원 준비 상태와 맞춰본다. 요건 사전이 필요해
    카드 안에서는 못 만들고, 여기서 이 페이지에 그릴 공고만 한 번에 계산해 넘긴다.
  */
  const badgeJobs = [...result.items, ...(recommendation?.preparation?.jobs ?? [])];
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
    if (sp.sgg) params.set("sgg", sp.sgg);
    if (sp.category) params.set("category", sp.category);
    if (sp.beginner) params.set("beginner", sp.beginner);
    if (sp.closingSoon) params.set("closingSoon", sp.closingSoon);
    if (sp.sort) params.set("sort", sp.sort);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/jobs${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4.5 py-10 lg:px-8">
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
          region,
          regionSigungus: sp.sgg ? sp.sgg.split(",").filter(Boolean) : undefined,
          jobCategories: parseJobCategories(sp.category),
          isBeginnerFriendly: sp.beginner === "1",
          closingSoon: sp.closingSoon === "1",
          sort: (sp.sort as JobSortOrder | undefined) ?? "recommended",
        }}
        jobCategoryLabel={jobCategoryLabel}
        profileRegion={careerProfile?.region}
        summary={
          <p className="text-body-2 text-slate-500">
            총 <span className="font-bold text-brand-blue-600">{result.total.toLocaleString()}건</span>
          </p>
        }
      >
      {/* 검사 기반 "맞춤 공고"는 큐레이션의 맞춤 추천 탭이 담당한다 - job-curation.service. */}
      {/* 회원 조건으로 고른 묶음이라 로그인했을 때만 그린다. */}
      {initialCuration && (
        <div className="mt-8">
          <JobCurationSection
            initialActive={initialCuration}
            bookmarkedIds={bookmarkedIds}
          />
        </div>
      )}
      </JobFiltersForm>

      <div className="mt-8">
        <h2 className="text-body-1 font-bold text-slate-900">
          전체 공고 <span className="font-semibold text-brand-blue-600">{result.total.toLocaleString()}</span>
          <span className="ml-0.5 text-body-2 font-medium text-slate-500">건</span>
        </h2>
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
              {result.items.slice(0, INTERLEAVE_AFTER).map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  matchReasonLabel={job.match?.reasons[0]?.label}
                  isAuthenticated={isAuthenticated}
                  isBookmarked={bookmarkedSet.has(job.id)}
                  readiness={readinessMap.get(job.id)}
                  hoverTint
                />
              ))}
            </div>

            {/*
              진단 준비 트랙("자격 따면 열리는") 섹션은 목록 사이에 끼운다.
              맨 위에 두면 검색 결과가 밀리고, 맨 아래면 아무도 못 본다.
              페이지를 넘길 때마다 또 나오면 광고처럼 읽혀 첫 페이지에만 둔다.
            */}
            {page === 1 && recommendation?.preparation && recommendation.preparation.jobs.length > 0 && (
              <div className="mt-6 rounded-2xl bg-amber-50/70 p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-5 text-amber-600" />
                  <h2 className="text-body-1 font-bold text-slate-900">
                    자격 따면 열리는 &ldquo;{recommendation.preparation.occupationName}&rdquo; 공고
                  </h2>
                </div>
                <p className="mt-1 text-label-1 text-slate-600">
                  진단에서 성향이 잘 맞았던 직업이에요.
                  {recommendation.preparation.missingQualifications?.length
                    ? ` ${recommendation.preparation.missingQualifications.join(", ")}을(를) 취득하면 지원할 수 있어요.`
                    : ""}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {recommendation.preparation.jobs.map((job) => (
                    <JobRowCompact
                      key={`prep-${job.id}`}
                      job={job}
                      readiness={readinessMap.get(job.id)}
                      outsideRegion={recommendation.preparation?.outsideRegionJobIds?.includes(job.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {result.items.length > INTERLEAVE_AFTER && (
              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {result.items.slice(INTERLEAVE_AFTER).map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    matchReasonLabel={job.match?.reasons[0]?.label}
                    isAuthenticated={isAuthenticated}
                    isBookmarked={bookmarkedSet.has(job.id)}
                    readiness={readinessMap.get(job.id)}
                    hoverTint
                  />
                ))}
              </div>
            )}

            <Pagination page={page} totalPages={totalPages} buildHref={buildPageHref} className="mt-8" />
          </>
        )}
      </div>
    </div>
  );
}
