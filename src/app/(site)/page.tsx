// 진행 현황 섹션은 삭제가 아니라 숨김 상태다. 되살릴 때 아래 두 줄의 주석을 해제한다.
// import { ProgressStepsSection } from "@/features/home/progress-steps-section";
import { HeroSection } from "@/features/home/hero-section";
import { CoreServicesSection } from "@/features/home/core-services-section";
import { StatsBannerSection } from "@/features/home/stats-banner-section";
import { PopularJobsSection } from "@/features/home/popular-jobs-section";
import { SupportHighlightsSection } from "@/features/home/support-highlights-section";
import { CtaSection } from "@/features/home/cta-section";
import { getJobRepository } from "@/lib/repositories";

/*
  홈 페이지는 활성 채용공고 수치를 보여주기 위해 서버에서 렌더된다.
  하루 한 번 정도만 바뀌면 충분한 값이라 6시간 캐시로 두어, 첫 방문마다 카운트를 새로 세지 않는다.
*/
export const revalidate = 21600;

async function loadActiveJobCount(): Promise<number | undefined> {
  try {
    const { total } = await getJobRepository().search({ activeOnly: true, page: 1, pageSize: 1 });
    return total;
  } catch (err) {
    console.error("[home] 활성 공고 수치 조회 실패", err);
    return undefined;
  }
}

export default async function HomePage() {
  const jobCount = await loadActiveJobCount();
  return (
    <>
      <HeroSection />
      {/* <ProgressStepsSection /> */}
      <CoreServicesSection />
      <StatsBannerSection jobCount={jobCount} />
      <PopularJobsSection />
      <SupportHighlightsSection />
      <CtaSection />
    </>
  );
}
