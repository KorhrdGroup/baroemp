import { HeroSection } from "@/features/home/hero-section";
import { CoreServicesSection } from "@/features/home/core-services-section";
import { PopularJobsSection } from "@/features/home/popular-jobs-section";
import { ProgressStepsSection } from "@/features/home/progress-steps-section";
import { QuickLinksSection } from "@/features/home/quick-links-section";
import { CtaSection } from "@/features/home/cta-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CoreServicesSection />
      <PopularJobsSection />
      <ProgressStepsSection />
      <QuickLinksSection />
      <CtaSection />
    </>
  );
}
