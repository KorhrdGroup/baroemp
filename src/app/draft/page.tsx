import { AccountCard } from "@/features/home-draft/account-card";
import { FeaturedJobsPanel, type FeaturedJobsTab } from "@/features/home-draft/featured-jobs-panel";
import { QuickToolsCard } from "@/features/home-draft/quick-tools-card";
import { SupportBanner } from "@/features/home-draft/support-banner";
import { SituationTabsSection } from "@/features/home-draft/situation-tabs-section";
import { SupportHighlightsSection } from "@/features/home-draft/support-highlights-section";
import { QualificationSection } from "@/features/home-draft/qualification-section";
import { RecommendedJobsSection } from "@/features/home-draft/recommended-jobs-section";
import { getUserJobBookmarkIdsAction } from "@/features/jobs/job-actions";
import { getCurrentUser } from "@/lib/auth/session";
import { getJobRepository } from "@/lib/repositories";
import type { Job, JobSearchFilter } from "@/types";

/*
  디자인 리뉴얼 시안의 홈. 최근 올라온 공고 8건을 받아 프로세스 안에 10분 기억한다.
  공고 수는 화면에 쓰지 않아 세지 않는다.
*/
const HOME_JOBS_TTL_MS = 10 * 60 * 1000;
const HOME_JOBS_LIMIT = 8;
let homeJobsCache: { at: number; items: Job[] } | null = null;

async function loadHomeJobs(): Promise<{ items: Job[] }> {
  if (homeJobsCache && Date.now() - homeJobsCache.at < HOME_JOBS_TTL_MS) return homeJobsCache;
  try {
    const { items } = await getJobRepository().search({
      activeOnly: true,
      page: 1,
      pageSize: HOME_JOBS_LIMIT,
      sort: "latest",
      withTotal: false,
    });
    homeJobsCache = { at: Date.now(), items };
    return homeJobsCache;
  } catch (err) {
    console.error("[home] 최근 공고 조회 실패", err);
    return homeJobsCache ?? { items: [] };
  }
}

/*
  첫 줄 공고 판의 탭. 회원 조건 없이 고를 수 있는 것만 둔다 - 비로그인에게도 같은 판이 보인다.
  탭마다 아홉 건(세 장씩 세 번 넘김)을 받고 건수는 세지 않는다(withTotal: false). 위 최근 공고와 같이 10분 기억한다.
*/
const FEATURED_TABS: { key: string; label: string; emoji: string; href: string; filter: Partial<JobSearchFilter> }[] = [
  { key: "closing", label: "마감 임박", emoji: "⏰", href: "/jobs?closingSoon=1&sort=deadline", filter: { closingWithinDays: 7, sort: "deadline" } },
  { key: "beginner", label: "경력 없어도 돼요", emoji: "🙌", href: "/jobs?beginner=1", filter: { isBeginnerFriendly: true, sort: "latest" } },
  /*
    "급여 높은 순"을 두려 했으나 지역·직종 없이 급여로 줄 세우는 조회가 8초 제한에 걸린다(색인 없음).
    대신 공고가 가장 많은 요양보호사를 둔다.
  */
  { key: "care", label: "요양보호사", emoji: "🤝", href: "/jobs?category=care_worker&sort=latest", filter: { jobCategoryPatterns: ["5501"], sort: "latest" } },
];
const FEATURED_PER_TAB = 9;
let featuredCache: { at: number; tabs: FeaturedJobsTab[] } | null = null;

async function loadFeaturedTabs(): Promise<FeaturedJobsTab[]> {
  if (featuredCache && Date.now() - featuredCache.at < HOME_JOBS_TTL_MS) return featuredCache.tabs;
  const repo = getJobRepository();
  const tabs = await Promise.all(
    FEATURED_TABS.map(async ({ filter, ...tab }) => {
      try {
        const { items } = await repo.search({ activeOnly: true, page: 1, pageSize: FEATURED_PER_TAB, withTotal: false, ...filter });
        return { ...tab, jobs: items };
      } catch (err) {
        console.error(`[home] 공고 판 "${tab.label}" 조회 실패`, err);
        return { ...tab, jobs: [] as Job[] };
      }
    }),
  );
  // 하나라도 비었으면 기억하지 않는다 - 잠깐 실패한 탭이 10분 동안 빠져 있지 않게.
  if (tabs.every((t) => t.jobs.length > 0)) featuredCache = { at: Date.now(), tabs };
  return featuredCache?.tabs ?? tabs;
}

export default async function DraftHomePage() {
  const [{ items: jobs }, featuredTabs, user] = await Promise.all([
    loadHomeJobs(),
    loadFeaturedTabs(),
    getCurrentUser(),
  ]);
  // 찜 상태는 회원마다 달라 캐시에 넣지 않는다. 보여줄 공고가 있을 때만 읽는다.
  const bookmarkedIds = user && jobs.length > 0 ? await getUserJobBookmarkIdsAction() : [];
  return (
    <div className="pb-16 sm:pb-24">
      {/*
        위쪽(첫 줄 · 지원금 띠 · 최근 공고)은 흰 바탕에 놓는다. 회색 바탕은 그 아래 구역부터.
        최근 공고까지 함께 감싸야 둘 사이에 회색 틈이 생기지 않는다.
      */}
      <div className="bg-white">
      {/*
        첫 줄 (사람인의 3단 중 가운데 · 오른쪽). 검색은 머리글이 맡고, 여기는 곧장 공고로 시작한다.
        넓은 화면은 공고 판(9칸) 옆에 로그인 카드와 지원금 배너(3칸)를 세우고, 도구 상자는 그 아래 한 줄로 놓는다.
        휴대폰은 공고 판 → 지원금 배너 → 도구 상자 순이고, 로그인 카드는 아래 탭의 "마이"가 대신한다.
      */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-3 px-4.5 pt-4 sm:gap-4 sm:pt-8 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-9">
          <FeaturedJobsPanel
            tabs={featuredTabs}
            isAuthenticated={Boolean(user)}
            bookmarkedIds={bookmarkedIds}
          />
        </div>
        <div className="flex flex-col gap-3 sm:gap-4 lg:col-span-3">
          <div className="hidden lg:block">
            <AccountCard user={user} />
          </div>
          {/* 공고 판 높이에 맞춰 남는 세로를 배너가 채운다. */}
          <div className="flex flex-1 flex-col">
            <SupportBanner />
          </div>
        </div>
      </section>

      <div className="mx-auto mt-3 max-w-7xl px-4.5 sm:mt-4 lg:px-8">
        <QuickToolsCard />
      </div>

      {jobs.length > 0 && (
        <RecommendedJobsSection jobs={jobs} isAuthenticated={Boolean(user)} bookmarkedIds={bookmarkedIds} />
      )}
      </div>
      <QualificationSection />
      <SituationTabsSection />
      <SupportHighlightsSection />
    </div>
  );
}
