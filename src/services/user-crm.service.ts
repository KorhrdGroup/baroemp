import { activityEventLogger } from "@/lib/activity/event-logger";
import { isSupabaseMode } from "@/lib/data/mode";
import { matchingEngine } from "@/lib/matching/engine";
import {
  findCareerProfileByUserId,
  getAssessmentResultRepository,
  getConsultationRepository,
  getJobRepository,
  getLeadRepository,
  getProfileRepository,
  getSupportProgramRepository,
  getUserAcquisitionRepository,
} from "@/lib/repositories";
import { attachRecommendationRulesToAll } from "@/lib/content/with-rules";
import { mockActivityEvents } from "@/mocks/activity-events.mock";
import { mockContents } from "@/mocks/contents.mock";
import { mockJobRoles } from "@/mocks/job-roles.mock";
import type { ActivityEvent, RecommendedItem, UserCrmDetail, UserResumeSummary } from "@/types";
import { listContents } from "./content.service";
import { getUserJobBehaviorSummary } from "./job-behavior-summary.service";
import { getUserSupportBehaviorSummary } from "./support-behavior-summary.service";
import { listAdminUsersPaged } from "./admin-user-list.service";
import { listResumesForUser } from "./resume.service";
import { listCoverLettersForUser } from "./cover-letter.service";
import { listCareerGapSummariesForUser } from "./career-gap-engine.service";

/**
 * 관리자 회원상세("이력서/자소서" 섹션, 스펙 38번) + 마이페이지(스펙 51번)에서 공유하는 요약.
 * 이력서 원문/자소서 원문은 절대 담지 않고, 개수/완성도/최근수정일 등 메타 정보만 노출한다.
 */
async function buildUserResumeSummary(userId: string, allActivities: ActivityEvent[]): Promise<UserResumeSummary> {
  const [resumes, coverLetters] = await Promise.all([listResumesForUser(userId), listCoverLettersForUser(userId)]);
  const primary = resumes.find((r) => r.isPrimary) ?? resumes[0];
  const lastAiReview = allActivities
    .filter((a) => a.userId === userId && a.eventType === "resume_ai_reviewed")
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))[0];

  return {
    resumeCount: resumes.length,
    primaryResume: primary
      ? {
          id: primary.id,
          title: primary.title,
          completeness: primary.completeness,
          desiredJobTitle: primary.desiredJobTitle,
          updatedAt: primary.updatedAt,
        }
      : undefined,
    coverLetterCount: coverLetters.length,
    lastCoverLetterUpdatedAt: coverLetters[0]?.updatedAt,
    lastAiReviewedAt: lastAiReview?.occurredAt,
    targetJobIds: [...new Set(resumes.map((r) => r.targetJobId).filter((v): v is string => Boolean(v)))],
  };
}

function toGrade(score: number): RecommendedItem["grade"] {
  if (score >= 60) return "A";
  if (score >= 40) return "B";
  if (score >= 20) return "C";
  return "D";
}

async function ensureActivitySeed(): Promise<void> {
  // Supabase Mode에서는 데모용 Mock 이벤트를 실제 DB에 주입하지 않는다.
  if (isSupabaseMode()) return;
  if ((await activityEventLogger.getRecentEvents(1)).length > 0) return;
  for (const event of mockActivityEvents) {
    await activityEventLogger.log({
      userId: event.userId,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: event.metadata,
      occurredAt: event.occurredAt,
    });
  }
}

/**
 * 스펙 24/25번: /admin/users 실DB 전환. 검색/필터/페이지네이션이 필요한 목록 조회는
 * admin-user-list.service.ts의 listAdminUsersPaged()로 분리했다 (N+1 방지를 위해 페이지 단위로만
 * career_profiles/leads/user_acquisition을 batch 조회). 이 함수는 기존 호출부(세그먼트 필터 없는
 * 전체 목록이 필요한 곳) 호환을 위해 유지하되, 내부적으로 페이지네이션 없이 전체를 1회 조회한다.
 */
export async function listAdminUsers() {
  const { items } = await listAdminUsersPaged({ page: 1, pageSize: 500 });
  return items;
}

export async function getUserCrmDetail(userId: string): Promise<UserCrmDetail | null> {
  await ensureActivitySeed();

  const profile = await getProfileRepository().findById(userId);
  if (!profile) return null;

  const careerProfile = (await findCareerProfileByUserId(userId)) ?? undefined;
  const leads = await getLeadRepository().findAll();
  const lead = leads.find((l) => l.userId === userId);

  const contents = attachRecommendationRulesToAll(await listContents({ status: "published" }));
  const jobs = await getJobRepository().findAll({ keyword: undefined });
  const supports = await getSupportProgramRepository().findAll();
  const consultations = await getConsultationRepository().findAll({ userId });
  const assessmentResults = (await getAssessmentResultRepository().findAll({ userId })).sort((a, b) =>
    a.completedAt < b.completedAt ? 1 : -1,
  );

  const contentMatches = careerProfile
    ? matchingEngine.matchContentsForProfile(careerProfile, contents, 5)
    : [];
  const jobMatches = careerProfile
    ? matchingEngine.matchJobsForProfile(careerProfile, jobs, 5)
    : [];
  const supportMatches = careerProfile
    ? matchingEngine.matchSupportProgramsForProfile(careerProfile, supports, 5)
    : [];

  const titleByContent = new Map(mockContents.map((c) => [c.id, c.title]));
  const titleByJob = new Map(jobs.map((j) => [j.id, j.title]));
  const titleBySupport = new Map(supports.map((s) => [s.id, s.title]));

  const jobBehavior = await getUserJobBehaviorSummary(userId);
  const supportBehavior = await getUserSupportBehaviorSummary(userId);

  const persistedActivities = await activityEventLogger.getEventsByUser(userId);
  const allActivities = [
    ...persistedActivities,
    ...(isSupabaseMode() ? [] : mockActivityEvents.filter((e) => e.userId === userId)),
  ].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  const activities = allActivities.slice(0, 30);
  const resumeSummary = await buildUserResumeSummary(userId, allActivities);
  const careerGapSummaries = await listCareerGapSummariesForUser(userId, 3);

  return {
    profile,
    careerProfile,
    lead,
    acquisition: (await getUserAcquisitionRepository().findByUserId(userId)) ?? undefined,
    interestedJobs: (careerProfile?.desiredJobCategories ?? []).map((cat, i) => ({
      id: cat,
      label: mockJobRoles.find((r) => r.jobCategory === cat)?.name ?? cat,
      score: 10 - i,
      source: "ASSESSMENT",
    })),
    heldQualifications: (careerProfile?.heldQualifications ?? []).map((q, i) => ({
      id: `held-${i}`,
      label: q,
      source: "MANUAL",
    })),
    interestedQualifications: (careerProfile?.interestedQualifications ?? []).map((q, i) => ({
      id: `iq-${i}`,
      label: q,
      source: "AI_RECOMMENDATION",
    })),
    interestedContents: contentMatches.slice(0, 3).map((m) => ({
      id: m.targetId,
      label: titleByContent.get(m.targetId) ?? m.targetId,
      score: m.score,
      source: "AI_RECOMMENDATION",
    })),
    activities,
    recommendedContents: contentMatches.map((m) => ({
      id: m.targetId,
      title: titleByContent.get(m.targetId) ?? m.targetId,
      type: "CONTENT",
      score: m.score,
      grade: toGrade(m.score),
      reasons: m.reasons,
    })),
    recommendedJobs: jobMatches.map((m) => ({
      id: m.targetId,
      title: titleByJob.get(m.targetId) ?? m.targetId,
      type: "JOB",
      score: m.score,
      grade: toGrade(m.score),
      reasons: m.reasons,
    })),
    recommendedSupports: supportMatches.map((m) => ({
      id: m.targetId,
      title: titleBySupport.get(m.targetId) ?? m.targetId,
      type: "SUPPORT_PROGRAM",
      score: m.score,
      grade: toGrade(m.score),
      reasons: m.reasons,
    })),
    consultations,
    matchResults: [...contentMatches, ...jobMatches, ...supportMatches],
    assessmentResults,
    jobBehavior,
    supportBehavior,
    resumeSummary,
    careerGapSummaries,
  };
}
