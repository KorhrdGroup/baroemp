import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import {
  getAssessmentResultRepository,
  getEmploymentDestinationRepository,
  getJobInterestRepository,
  getOccupationRepository,
} from "@/lib/repositories";
import { CareerGapTargetPicker } from "@/features/career-gap/career-gap-target-picker";
import type { EmploymentDestination, Occupation } from "@/types";

export const metadata: Metadata = {
  title: "취업 준비도 확인 | 한평생 바로취업",
};

interface SuggestedTarget {
  occupationId: string;
  occupationName: string;
  source: "직업진단 추천" | "관심 직업";
}

export default async function CareerGapEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ occupation?: string; destination?: string; job?: string }>;
}) {
  const user = await requireUser("/career-gap");
  const { occupation: presetOccupationId, destination: presetDestinationId, job: presetJobId } = await searchParams;

  const [occupations, destinations, assessmentResults, jobInterests] = await Promise.all([
    getOccupationRepository().findAll(),
    getEmploymentDestinationRepository().findAll({ status: "active" }),
    getAssessmentResultRepository().findAll({ userId: user.id }),
    getJobInterestRepository().findAll({ userId: user.id }),
  ]);

  const publishedOccupations = occupations
    .filter((o) => o.status === "published")
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const destinationsByOccupationId = destinations.reduce<Record<string, EmploymentDestination[]>>((acc, dest) => {
    (acc[dest.occupationId] ??= []).push(dest);
    return acc;
  }, {});
  for (const list of Object.values(destinationsByOccupationId)) {
    list.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  const occupationById = new Map(occupations.map((o): [string, Occupation] => [o.id, o]));
  const latestAssessment = [...assessmentResults].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))[0];

  const suggested: SuggestedTarget[] = [];
  for (const rec of latestAssessment?.recommendations.slice(0, 3) ?? []) {
    if (occupationById.has(rec.occupationId)) {
      suggested.push({ occupationId: rec.occupationId, occupationName: rec.occupationName, source: "직업진단 추천" });
    }
  }
  for (const interest of [...jobInterests].sort((a, b) => b.interestScore - a.interestScore).slice(0, 3)) {
    if (occupationById.has(interest.occupationId) && !suggested.some((s) => s.occupationId === interest.occupationId)) {
      suggested.push({ occupationId: interest.occupationId, occupationName: interest.occupationName, source: "관심 직업" });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-label-1 font-semibold text-brand-blue-600">취업 준비도 확인</p>
        <h1 className="mt-1 text-title-2 font-bold text-slate-900 sm:text-headline-3">어떤 직업을 준비하고 계세요?</h1>
        <p className="mt-2 text-body-2-reading text-slate-500">
          실제 채용공고 데이터를 바탕으로 현재 준비 상태를 확인하고, 무엇을 보완하면 지원할 수 있는 일자리가
          늘어나는지 알려드려요.
        </p>
      </div>

      <CareerGapTargetPicker
        occupations={publishedOccupations}
        destinationsByOccupationId={destinationsByOccupationId}
        suggested={suggested}
        presetOccupationId={presetOccupationId}
        presetDestinationId={presetDestinationId}
        presetJobId={presetJobId}
      />
    </div>
  );
}
