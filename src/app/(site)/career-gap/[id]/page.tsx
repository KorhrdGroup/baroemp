import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getCareerGapRepository } from "@/lib/repositories";
import { getCareerGapResult } from "@/services/career-gap-engine.service";
import { CareerGapResultDashboard } from "@/features/career-gap/career-gap-result-dashboard";

export const metadata: Metadata = {
  title: "취업 준비도 결과 | 한평생 바로취업",
};

export default async function CareerGapResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/career-gap/${id}`);

  const analysis = await getCareerGapRepository().findAnalysisById(id);
  if (!analysis || analysis.userId !== user.id) notFound();

  const result = await getCareerGapResult(id);
  if (!result) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <CareerGapResultDashboard result={result} />
    </div>
  );
}
