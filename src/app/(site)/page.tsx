import { HeroSection } from "@/features/home/hero-section";
import { CoreServicesSection } from "@/features/home/core-services-section";
import { PopularJobsSection } from "@/features/home/popular-jobs-section";
import { ProgressStepsSection } from "@/features/home/progress-steps-section";
import { CtaSection } from "@/features/home/cta-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ProgressStepsSection />
      <PopularJobsSection />
      <CoreServicesSection />
      <CtaSection />
    </>
  );
}
