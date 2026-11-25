import { AccountCard } from "@/features/home-draft/account-card";
import { FeaturedJobsPanel } from "@/features/home-draft/featured-jobs-panel";
import { QuickToolsCard } from "@/features/home-draft/quick-tools-card";
import { SupportBanner } from "@/features/home-draft/support-banner";
import { SituationTabsSection } from "@/features/home-draft/situation-tabs-section";
import { SupportHighlightsSection } from "@/features/home-draft/support-highlights-section";
import { QualificationSection } from "@/features/home-draft/qualification-section";
import { RecommendedJobsSection } from "@/features/home-draft/recommended-jobs-section";
import { getUserJobBookmarkIdsAction } from "@/features/jobs/job-actions";
import { loadFeaturedTabs, loadHomeJobs } from "@/features/home-draft/load-home-data";
import { getCurrentUser } from "@/lib/auth/session";

/* 디자인 리뉴얼 시안의 홈. 공고 읽기(10분 기억)는 /draft2 와 함께 load-home-data.ts 에 둔다. */
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
