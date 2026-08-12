import { activityEventLogger } from "@/lib/activity/event-logger";
import { getCoverLetterRepository, getResumeRepository, getResumeTemplateRepository } from "@/lib/repositories";
import { findCareerProfileByUserId } from "@/lib/repositories";
import { labelAgeGroup } from "@/lib/labels";

function topN(items: string[], n: number): { key: string; count: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    if (!item) continue;
    map.set(item, (map.get(item) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export interface ResumeAnalyticsSnapshot {
  resumeCreatingMemberCount: number;
  completedResumeCount: number;
  averageCompleteness: number;
  aiReviewUsageCount: number;
  coverLetterCreatedCount: number;
  jobLinkedResumeCount: number;
  byTemplate: { key: string; count: number }[];
  byAgeGroupCompletionRate: { key: string; count: number }[];
}

/**
 * /admin/analytics "이력서/자소서" 섹션용 (스펙 52번).
 * 이력서 원문은 절대 조회/노출하지 않고, activity_events + resumes 메타 정보만 집계한다.
 */
export async function getResumeAnalyticsSnapshot(): Promise<ResumeAnalyticsSnapshot> {
  const [resumes, coverLetters, templates, events] = await Promise.all([
    getResumeRepository().findAll({}),
    getCoverLetterRepository().findAll({}),
    getResumeTemplateRepository().findAll({}),
    activityEventLogger.getRecentEvents(3000),
  ]);

  const templateNameById = new Map(templates.map((t) => [t.id, t.name]));
  const resumeCreatingMembers = new Set(resumes.map((r) => r.userId));
  const completedResumes = resumes.filter((r) => r.status === "completed");
  const averageCompleteness = resumes.length
    ? Math.round(resumes.reduce((sum, r) => sum + (r.completeness ?? 0), 0) / resumes.length)
    : 0;
  const aiReviewUsageCount = events.filter((e) => e.eventType === "resume_ai_reviewed").length;
  const jobLinkedResumeCount = resumes.filter((r) => Boolean(r.targetJobId)).length;

  const byTemplate = topN(
    resumes.map((r) => (r.templateId ? templateNameById.get(r.templateId) ?? "알수없음" : "템플릿 없음")),
    10,
  );

  // 연령대별 완성이력서 수 (career_profiles.ageGroup 기준). N+1을 피하기 위해 대표이력서 소유자만 조회.
  const uniqueUserIds = [...resumeCreatingMembers];
  const ageGroups = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const [profile, resumeForUser] = await Promise.all([
        findCareerProfileByUserId(userId),
        Promise.resolve(resumes.filter((r) => r.userId === userId)),
      ]);
      const hasCompleted = resumeForUser.some((r) => r.status === "completed");
      return hasCompleted ? profile?.ageGroup : undefined;
    }),
  );
  const byAgeGroupCompletionRate = topN(
    ageGroups.filter((g): g is NonNullable<typeof g> => Boolean(g)).map((g) => labelAgeGroup(g)),
    10,
  );

  return {
    resumeCreatingMemberCount: resumeCreatingMembers.size,
    completedResumeCount: completedResumes.length,
    averageCompleteness,
    aiReviewUsageCount,
    coverLetterCreatedCount: coverLetters.length,
    jobLinkedResumeCount,
    byTemplate,
    byAgeGroupCompletionRate,
  };
}
