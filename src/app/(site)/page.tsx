// 진행 현황 섹션은 삭제가 아니라 숨김 상태다. 되살릴 때 아래 두 줄의 주석을 해제한다.
// import { ProgressStepsSection } from "@/features/home/progress-steps-section";
import { HeroSection } from "@/features/home/hero-section";
import { CoreServicesSection } from "@/features/home/core-services-section";
import { PopularJobsSection } from "@/features/home/popular-jobs-section";
import { CtaSection } from "@/features/home/cta-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      {/* <ProgressStepsSection /> */}
      <CoreServicesSection />
      <PopularJobsSection />
      <CtaSection />
    </>
  );
}
