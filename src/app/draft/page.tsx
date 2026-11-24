import { HeroSection } from "@/features/home-draft/hero-section";
import { HeroSideCards } from "@/features/home-draft/hero-side-cards";
import { AccountCard } from "@/features/home-draft/account-card";
import { CoreServicesSection } from "@/features/home-draft/core-services-section";
import { SituationTabsSection } from "@/features/home-draft/situation-tabs-section";
import { SupportHighlightsSection } from "@/features/home-draft/support-highlights-section";
import { QualificationSection } from "@/features/home-draft/qualification-section";
import { RecommendedJobsSection } from "@/features/home-draft/recommended-jobs-section";
import { getUserJobBookmarkIdsAction } from "@/features/jobs/job-actions";
import { getCurrentUser } from "@/lib/auth/session";
import { getJobRepository } from "@/lib/repositories";
import type { Job } from "@/types";

/*
  디자인 리뉴얼 시안의 홈. 최근 올라온 공고 8건과 활성 공고 수(추정치)를 한 번의 조회로 받아
  프로세스 안에 10분 기억한다.
*/
const HOME_JOBS_TTL_MS = 10 * 60 * 1000;
const HOME_JOBS_LIMIT = 8;
let homeJobsCache: { at: number; total: number; items: Job[] } | null = null;

async function loadHomeJobs(): Promise<{ total?: number; items: Job[] }> {
  if (homeJobsCache && Date.now() - homeJobsCache.at < HOME_JOBS_TTL_MS) return homeJobsCache;
  try {
    const { total, items } = await getJobRepository().search({
      activeOnly: true,
      page: 1,
      pageSize: HOME_JOBS_LIMIT,
      sort: "latest",
      withTotal: "estimated",
    });
    homeJobsCache = { at: Date.now(), total, items };
    return homeJobsCache;
  } catch (err) {
    console.error("[home] 최근 공고·활성 공고 수치 조회 실패", err);
    return homeJobsCache ?? { items: [] };
  }
}

export default async function DraftHomePage() {
  const [{ total: jobCount, items: jobs }, user] = await Promise.all([loadHomeJobs(), getCurrentUser()]);
  // 찜 상태는 회원마다 달라 캐시에 넣지 않는다. 보여줄 공고가 있을 때만 읽는다.
  const bookmarkedIds = user && jobs.length > 0 ? await getUserJobBookmarkIdsAction() : [];
  return (
    <div className="pb-16 sm:pb-24">
      {/*
        첫 줄 (잡아바의 3단). 넓은 화면은 검색 판 · 소식 카드 두 장 · 로그인 카드가 나란히 서서 폭을 채우고
        (앱 화면을 가운데 세워 둔 모양이 되지 않게), 좁은 화면은 검색 판 아래에 소식 카드가 두 칸으로 온다.
        로그인 카드는 휴대폰에서 아래 탭의 "마이"가 대신한다.
      */}
      <section className="mx-auto grid max-w-7xl gap-3 px-4.5 pt-4 sm:gap-4 sm:pt-8 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-6">
          <HeroSection jobCount={jobCount} />
        </div>
        <div className="lg:col-span-3">
          <HeroSideCards />
        </div>
        <div className="hidden lg:col-span-3 lg:block">
          <AccountCard user={user} />
        </div>
      </section>

      <div className="mx-auto mt-3 max-w-7xl px-4.5 sm:mt-4 lg:px-8">
        <CoreServicesSection />
      </div>

      {jobs.length > 0 && (
        <RecommendedJobsSection jobs={jobs} isAuthenticated={Boolean(user)} bookmarkedIds={bookmarkedIds} />
      )}
      <QualificationSection />
      <SituationTabsSection />
      <SupportHighlightsSection />
    </div>
  );
}
