import { REGION_LABELS } from "@/lib/labels";
import {
  getAssessmentResultRepository,
  getAssessmentSessionRepository,
  getLeadRepository,
} from "@/lib/repositories";
import { mockAdminUsers } from "@/mocks/users.mock";

export interface AssessmentAnalyticsSnapshot {
  startedCount: number;
  completedCount: number;
  completionRate: number;
  averageDurationMinutes: number;
  topOccupations: { occupationId: string; occupationName: string; count: number; avgScore: number }[];
  ageGroupBreakdown: { key: string; occupationName: string; count: number }[];
  regionBreakdown: { key: string; count: number }[];
  educationWillingnessDistribution: { bucket: string; count: number }[];
  desiredStartTimingDistribution: { key: string; count: number }[];
  averageLeadScoreOfCompleters: number;
  gradeAConversionCount: number;
}

export async function getAssessmentAnalytics(assessmentId: string): Promise<AssessmentAnalyticsSnapshot> {
  const sessions = await getAssessmentSessionRepository().findAll({ assessmentId });
  const results = await getAssessmentResultRepository().findAll({ assessmentId });
  const leads = await getLeadRepository().findAll();
  const leadByUserId = new Map(leads.map((l) => [l.userId, l]));
  const nameByUserId = new Map(mockAdminUsers.map((u) => [u.id, u.ageGroup]));

  const startedCount = sessions.length;
  const completedCount = sessions.filter((s) => s.status === "completed").length;
  const completionRate = startedCount > 0 ? Math.round((completedCount / startedCount) * 100) : 0;

  const durations = sessions
    .filter((s) => s.completedAt)
    .map((s) => (new Date(s.completedAt!).getTime() - new Date(s.startedAt).getTime()) / 60000)
    .filter((m) => m > 0 && m < 60);
  const averageDurationMinutes =
    durations.length > 0 ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10 : 0;

  const occupationCounts = new Map<string, { name: string; count: number; scoreSum: number }>();
  const ageGroupOccupationCounts = new Map<string, { occupationName: string; count: number }>();
  const regionCounts = new Map<string, number>();
  const eduBuckets = new Map<string, number>();
  const timingCounts = new Map<string, number>();

  for (const result of results) {
    const top = result.recommendations[0];
    if (top) {
      const entry = occupationCounts.get(top.occupationId) ?? { name: top.occupationName, count: 0, scoreSum: 0 };
      entry.count += 1;
      entry.scoreSum += top.totalScore;
      occupationCounts.set(top.occupationId, entry);

      const ageGroup = result.userId ? nameByUserId.get(result.userId) : undefined;
      if (ageGroup) {
        const key = `${ageGroup}-${top.occupationName}`;
        const ageEntry = ageGroupOccupationCounts.get(key) ?? { occupationName: top.occupationName, count: 0 };
        ageEntry.count += 1;
        ageGroupOccupationCounts.set(key, ageEntry);
      }
    }

    if (result.extractedProfile.region) {
      const label = REGION_LABELS[result.extractedProfile.region] ?? result.extractedProfile.region;
      regionCounts.set(label, (regionCounts.get(label) ?? 0) + 1);
    }

    const eduScore = result.dimensionScores.education_willingness;
    if (typeof eduScore === "number") {
      const bucket = eduScore >= 70 ? "높음" : eduScore >= 40 ? "보통" : "낮음";
      eduBuckets.set(bucket, (eduBuckets.get(bucket) ?? 0) + 1);
    }

    const timing = result.extractedProfile.desiredStartTiming;
    if (timing) {
      timingCounts.set(timing, (timingCounts.get(timing) ?? 0) + 1);
    }
  }

  const completerUserIds = results.map((r) => r.userId).filter((id): id is string => Boolean(id));
  const completerLeads = completerUserIds.map((id) => leadByUserId.get(id)).filter((l): l is NonNullable<typeof l> => Boolean(l));
  const averageLeadScoreOfCompleters =
    completerLeads.length > 0
      ? Math.round(completerLeads.reduce((sum, l) => sum + l.score.totalScore, 0) / completerLeads.length)
      : 0;
  const gradeAConversionCount = completerLeads.filter((l) => l.score.grade === "A").length;

  return {
    startedCount,
    completedCount,
    completionRate,
    averageDurationMinutes,
    topOccupations: [...occupationCounts.entries()]
      .map(([occupationId, v]) => ({
        occupationId,
        occupationName: v.name,
        count: v.count,
        avgScore: Math.round(v.scoreSum / v.count),
      }))
      .sort((a, b) => b.count - a.count),
    ageGroupBreakdown: [...ageGroupOccupationCounts.entries()].map(([key, v]) => ({
      key: key.split("-")[0],
      occupationName: v.occupationName,
      count: v.count,
    })),
    regionBreakdown: [...regionCounts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
    educationWillingnessDistribution: [...eduBuckets.entries()].map(([bucket, count]) => ({ bucket, count })),
    desiredStartTimingDistribution: [...timingCounts.entries()].map(([key, count]) => ({ key, count })),
    averageLeadScoreOfCompleters,
    gradeAConversionCount,
  };
}
