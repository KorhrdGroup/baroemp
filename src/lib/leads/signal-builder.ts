import type { ActivityEvent, AssessmentResult, CareerProfile, UserJobInterest } from "@/types";
import type { LeadSignalInput } from "./scoring-engine";

/**
 * Activity Event + Career Profile 로부터 Lead Score 신호 입력을 생성한다.
 * Application Service 에서 recalculateLeadScore(userId) 시 사용.
 *
 * latestAssessmentResult 를 함께 넘기면 검사 관련 신호(검사완료/교육의향/고적합도)도 반영된다.
 * jobInterests(occupation별 관심도, source 포함)를 함께 넘기면 STEP 4 채용행동 신호도 반영된다.
 */
export function buildLeadSignalInput(params: {
  profile?: CareerProfile;
  events: ActivityEvent[];
  latestAssessmentResult?: AssessmentResult;
  jobInterests?: UserJobInterest[];
  now?: Date;
}): LeadSignalInput {
  const { profile, events, latestAssessmentResult, jobInterests = [] } = params;
  const now = params.now ?? new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const eventTypes = events.map((e) => e.eventType.toLowerCase());

  const wantsJobSoon =
    profile?.desiredStartTiming === "immediately" ||
    profile?.desiredStartTiming === "within_1_month" ||
    profile?.desiredStartTiming === "within_3_months";

  const jobViews = events.filter((e) =>
    ["job_viewed", "JOB_VIEWED", "job_detail_viewed"].includes(e.eventType),
  );
  const categoryCounts = new Map<string, number>();
  for (const view of jobViews) {
    const category = String(view.metadata?.jobCategory ?? view.entityId ?? "unknown");
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }
  const repeatedSameCategory = [...categoryCounts.values()].some((count) => count >= 3);

  const resumeReviewed = eventTypes.some((t) =>
    t.includes("resume_review") || t.includes("resume_reviewed"),
  );
  const supportChecked = eventTypes.some((t) => t.includes("support"));
  const consultationRequested = eventTypes.some((t) => t.includes("consultation_requested"));
  const activeWithin7Days = events.some((e) => new Date(e.occurredAt) >= sevenDaysAgo);

  const missingQualificationWithCourse =
    (profile?.heldQualifications?.length ?? 0) === 0 &&
    (profile?.interestedQualifications?.length ?? 0) > 0;

  const assessmentCompleted =
    Boolean(latestAssessmentResult) ||
    eventTypes.some((t) => t.includes("assessment_completed"));

  const highTrainingWillingness =
    Boolean(profile?.isOpenToTraining) ||
    (latestAssessmentResult?.dimensionScores.education_willingness ?? 0) >= 70;

  const highOccupationFit = (latestAssessmentResult?.recommendations ?? []).some((r) => r.totalScore >= 85);

  // STEP 4: 채용공고 행동 신호
  const jobBookmarkExists = eventTypes.some((t) => t.includes("job_bookmarked"));
  const jobApplyClickedRecent = events.some(
    (e) => e.eventType === "job_apply_clicked" && new Date(e.occurredAt) >= sevenDaysAgo,
  );
  const jobSearchActivityCount = events.filter(
    (e) =>
      new Date(e.occurredAt) >= sevenDaysAgo &&
      ["job_search_performed", "job_detail_viewed", "job_filter_changed"].includes(String(e.eventType)),
  ).length;
  const activeJobSearchWithin7Days = jobSearchActivityCount >= 3;

  const topJobBehaviorInterest = jobInterests
    .filter((i) => i.source === "JOB_BEHAVIOR")
    .sort((a, b) => b.interestScore - a.interestScore)[0];
  const missingQualificationHighJobInterest =
    (profile?.heldQualifications?.length ?? 0) === 0 && (topJobBehaviorInterest?.interestScore ?? 0) >= 60;

  // STEP 5: 지원금(Support Program) 행동 신호
  const supportAssessmentCompleted = eventTypes.some((t) => t === "support_search_completed");

  const supportViewEvents = events.filter((e) => e.eventType === "support_viewed");
  const supportViewCounts = new Map<string, number>();
  for (const view of supportViewEvents) {
    const key = String(view.entityId ?? view.metadata?.supportProgramId ?? "unknown");
    supportViewCounts.set(key, (supportViewCounts.get(key) ?? 0) + 1);
  }
  const supportDetailRepeatedView = [...supportViewCounts.values()].some((count) => count >= 3);

  const supportTrainingInterest =
    supportViewEvents.filter((e) => e.metadata?.category === "training").length >= 2;

  const supportApplyClickedRecent = events.some(
    (e) => e.eventType === "support_apply_clicked" && new Date(e.occurredAt) >= sevenDaysAgo,
  );

  // STEP 7: 이력서/자기소개서 Builder 행동 신호. 이력서 원문이 아닌 activity_events만으로 계산한다.
  const resumeCreated = eventTypes.includes("resume_created");
  const resumeCompleted = eventTypes.includes("resume_completed");
  const resumeAiReviewed = eventTypes.includes("resume_ai_reviewed");
  const coverLetterCreated = eventTypes.includes("cover_letter_created");
  const targetJobSelected = eventTypes.includes("target_job_selected");
  const resumeRecentlyUpdated = events.some(
    (e) => e.eventType === "resume_updated" && new Date(e.occurredAt) >= sevenDaysAgo,
  );

  // STEP 7.5: Career Gap Engine 행동 신호. 원문 상세가 아닌 activity_events(entityId/metadata)만으로 계산한다 (스펙 42/43번).
  const careerGapCompleted = eventTypes.includes("career_gap_analysis_completed");
  const careerGapContentClickEvents = events.filter((e) => e.eventType === "career_gap_content_clicked");
  const gapRecommendedContentClicked = careerGapContentClickEvents.length > 0;
  const distinctGapContentRequirements = new Set(
    careerGapContentClickEvents.map((e) => String(e.metadata?.requirementId ?? e.id)),
  );
  const highGapTrainingInterest = distinctGapContentRequirements.size >= 2;

  return {
    wants_job_within_3_months: Boolean(wantsJobSoon),
    repeated_same_category_job_views: repeatedSameCategory,
    resume_review_completed: resumeReviewed,
    support_program_checked: supportChecked,
    missing_qualification_with_course_available: missingQualificationWithCourse,
    consultation_requested: consultationRequested,
    active_within_7_days: activeWithin7Days,
    assessment_completed: assessmentCompleted,
    high_training_willingness: highTrainingWillingness,
    high_occupation_fit: highOccupationFit,
    job_bookmark_exists: jobBookmarkExists,
    job_apply_clicked_recent: jobApplyClickedRecent,
    active_job_search_within_7_days: activeJobSearchWithin7Days,
    missing_qualification_high_job_interest: missingQualificationHighJobInterest,
    support_assessment_completed: supportAssessmentCompleted,
    support_detail_repeated_view: supportDetailRepeatedView,
    support_training_interest: supportTrainingInterest,
    support_apply_clicked_recent: supportApplyClickedRecent,
    resume_created: resumeCreated,
    resume_completed: resumeCompleted,
    resume_ai_reviewed: resumeAiReviewed,
    cover_letter_created: coverLetterCreated,
    target_job_selected: targetJobSelected,
    resume_recently_updated: resumeRecentlyUpdated,
    career_gap_completed: careerGapCompleted,
    high_gap_training_interest: highGapTrainingInterest,
    gap_recommended_content_clicked: gapRecommendedContentClicked,
  };
}
