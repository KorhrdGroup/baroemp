import { activityEventLogger } from "@/lib/activity/event-logger";
import {
  JOB_INTEREST_REPEAT_VIEW_THRESHOLD,
  JOB_INTEREST_RULES,
  clampJobInterestScore,
} from "@/lib/jobs/job-interest-rules";
import { extractJobDetailTags, JOB_DETAIL_TAG_REPEAT_THRESHOLD } from "@/lib/jobs/job-tag-rules";
import { resolveOccupationForJobCategory } from "@/lib/jobs/job-occupation-resolver";
import { getJobInterestRepository } from "@/lib/repositories";
import { mergeCareerProfileFromAssessment } from "./career-profile-merge.service";
import type { Job, JobInterestSource } from "@/types";

export type JobInterestSignalType = "JOB_SEARCHED" | "JOB_VIEWED" | "JOB_BOOKMARKED" | "JOB_APPLY_CLICKED";

export interface RecordJobInterestSignalInput {
  userId?: string;
  anonymousId?: string;
  job: Job;
  signal: JobInterestSignalType;
}

async function countRecentSameCategoryViews(userId: string, jobCategory: string): Promise<number> {
  const events = await activityEventLogger.getEventsByUser(userId);
  return events.filter(
    (e) => e.eventType === "job_detail_viewed" && String(e.metadata?.jobCategory ?? "") === jobCategory,
  ).length;
}

async function countDetailTagOccurrences(userId: string, tag: string): Promise<number> {
  const events = await activityEventLogger.getEventsByUser(userId);
  return events.filter(
    (e) =>
      (e.eventType === "job_detail_viewed" || e.eventType === "job_bookmarked") &&
      Array.isArray(e.metadata?.detailTags) &&
      (e.metadata!.detailTags as string[]).includes(tag),
  ).length;
}

/**
 * 채용공고 행동(JOB_SEARCHED/JOB_VIEWED/JOB_BOOKMARKED/JOB_APPLY_CLICKED)을
 * user_job_interests(occupation 단위 관심도, source=JOB_BEHAVIOR)에 반영한다.
 *
 * Assessment 기반 관심도(source=ASSESSMENT)와는 별도 레코드로 쌓이며,
 * 최종 화면 표시 시 occupation별로 두 source를 함께 보여줄 수 있다 (career-interest.service 참고).
 *
 * 세부 관심 태그(#재가복지관심 등)는 같은 태그가 threshold 이상 반복되면
 * Career Profile.interestTags에 병합한다 (회원만 해당, 비회원은 로컬 신호만 축적).
 */
export async function recordJobInterestSignal(input: RecordJobInterestSignalInput): Promise<void> {
  const { userId, anonymousId, job, signal } = input;
  if (!userId && !anonymousId) return;

  // user_job_interests.occupation_id는 occupations.id(UUID) FK이므로, Job의 자유 코드인
  // jobCategory를 실제 occupation 엔티티로 먼저 해석한다. 매칭되는 occupation이 없으면
  // (아직 시드되지 않은 카테고리 등) 이 시그널은 occupation 단위로 반영하지 않는다.
  const occupation = await resolveOccupationForJobCategory(job.jobCategory);
  if (!occupation) return;

  const rule = JOB_INTEREST_RULES[signal];
  let points = rule.points;

  if (signal === "JOB_VIEWED" && userId) {
    const viewCount = await countRecentSameCategoryViews(userId, job.jobCategory);
    if (viewCount + 1 >= JOB_INTEREST_REPEAT_VIEW_THRESHOLD) {
      points += JOB_INTEREST_RULES.JOB_VIEWED_REPEAT_BONUS.points;
    }
  }

  const jobInterestRepo = getJobInterestRepository();
  const existingAll = await jobInterestRepo.findAll(userId ? { userId } : { anonymousId });
  const existing = existingAll.find((item) => item.occupationId === occupation.id);
  const nextScore = clampJobInterestScore((existing?.interestScore ?? 0) + points);

  await jobInterestRepo.upsert({
    userId,
    anonymousId,
    occupationId: occupation.id,
    occupationName: occupation.name,
    interestScore: nextScore,
    source: "JOB_BEHAVIOR" satisfies JobInterestSource,
  });

  if (!userId) return; // 세부 태그의 Career Profile 반영은 회원만 지원한다.

  const detailTags = extractJobDetailTags(job);
  if (detailTags.length === 0) return;

  const promotedTags: string[] = [];
  for (const tag of detailTags) {
    const occurrences = await countDetailTagOccurrences(userId, tag);
    if (occurrences + 1 >= JOB_DETAIL_TAG_REPEAT_THRESHOLD) {
      promotedTags.push(`#${tag}관심`);
    }
  }
  if (promotedTags.length > 0) {
    await mergeCareerProfileFromAssessment(userId, { interestTags: promotedTags });
  }
}
