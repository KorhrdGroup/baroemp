import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AssessmentDetailTabs, type AssessmentResultRow } from "@/features/admin/assessment-detail-tabs";
import { getAssessmentAnalytics } from "@/services/assessment-analytics.service";
import { getAssessmentRepository, getAssessmentResultRepository, getLeadRepository } from "@/lib/repositories";
import { mockAdminUsers } from "@/mocks/users.mock";
import { labelDesiredStartTiming, labelRegion } from "@/lib/labels";

export default async function AdminAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assessment = await getAssessmentRepository().findById(id);
  if (!assessment) notFound();

  const [results, leads, analytics] = await Promise.all([
    getAssessmentResultRepository().findAll({ assessmentId: id }),
    getLeadRepository().findAll(),
    getAssessmentAnalytics(id),
  ]);

  const userById = new Map(mockAdminUsers.map((u) => [u.id, u]));
  const leadByUserId = new Map(leads.map((l) => [l.userId, l]));

  const resultRows: AssessmentResultRow[] = results
    .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))
    .map((result) => {
      const user = result.userId ? userById.get(result.userId) : undefined;
      const lead = result.userId ? leadByUserId.get(result.userId) : undefined;
      const top = result.recommendations[0];
      return {
        resultId: result.id,
        sessionId: result.sessionId,
        userId: result.userId,
        name: user?.name ?? "비회원",
        ageGroup: user?.ageGroup ?? "-",
        region: labelRegion(result.extractedProfile.region) || user?.region || "-",
        completedAt: result.completedAt,
        topOccupationName: top?.occupationName ?? "-",
        topScore: top?.totalScore ?? 0,
        desiredStartTiming: labelDesiredStartTiming(result.extractedProfile.desiredStartTiming),
        educationWillingness: result.dimensionScores.education_willingness ?? 0,
        leadScore: lead?.score.totalScore,
        leadStatus: lead?.status,
      };
    });

  return (
    <div className="space-y-4">
      <Link href="/admin/assessments" className="inline-flex items-center gap-1 text-[13px] text-brand-blue-600 hover:underline">
        <ChevronLeft className="size-4" /> 검사 목록
      </Link>
      <AssessmentDetailTabs assessment={assessment} resultRows={resultRows} analytics={analytics} />
    </div>
  );
}
