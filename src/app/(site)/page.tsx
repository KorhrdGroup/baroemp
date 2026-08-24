import { HeroSection } from "@/features/home/hero-section";
import { CoreServicesSection } from "@/features/home/core-services-section";
import { PopularJobsSection } from "@/features/home/popular-jobs-section";
import { CtaSection } from "@/features/home/cta-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CoreServicesSection />
      <PopularJobsSection />
      <CtaSection />
    </>
  );
}
