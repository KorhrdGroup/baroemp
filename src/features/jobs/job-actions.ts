"use server";

import { extractJobDetailTags } from "@/lib/jobs/job-tag-rules";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { getCurrentUser, requireSessionUser } from "@/lib/auth/session";
import { getJobBookmarkRepository, getJobRepository } from "@/lib/repositories";
import { recalculateLeadScore } from "@/services/lead-score.service";
import { recordJobInterestSignal } from "@/services/job-interest.service";
import { getJobCuration } from "@/services/job-curation.service";
import type { Job, JobSearchFilter, JobCurationTab, JobCurationResult } from "@/types";

/** 활동 로그용 userId/anonymousId를 결정한다. 클라이언트가 넘긴 userId는 신뢰하지 않고 항상 세션을 우선한다. */
async function resolveActorIds(anonymousId?: string): Promise<{ userId?: string; anonymousId?: string }> {
  const user = await getCurrentUser();
  return user ? { userId: user.id, anonymousId: undefined } : { userId: undefined, anonymousId };
}

function buildJobMetadata(job: Job, extra?: Record<string, unknown>): Record<string, unknown> {
  return {
    jobId: job.id,
    externalSource: job.externalSource,
    occupationCode: job.occupationCode ?? job.jobCategory,
    jobCategory: job.jobCategory,
    region: job.region,
    salary: job.salaryText,
    employmentType: job.workType,
    detailTags: extractJobDetailTags(job),
    ...extra,
  };
}

export interface TrackJobSearchInput {
  userId?: string;
  anonymousId?: string;
  keyword?: string;
  filter?: Record<string, unknown>;
  resultCount: number;
}

/** 채용공고 검색 실행 시 기록 (JOB_SEARCHED). 직종 필터가 있으면 Career Interest에도 소량 반영한다. */
export async function trackJobSearchAction(input: TrackJobSearchInput): Promise<void> {
  const actor = await resolveActorIds(input.anonymousId);
  await logActivityEvent({
    userId: actor.userId,
    anonymousId: actor.anonymousId,
    eventType: "job_search_performed",
    entityType: "job",
    metadata: { searchKeyword: input.keyword, filter: input.filter, resultCount: input.resultCount },
  });

  const jobCategory = input.filter?.jobCategory as string | undefined;
  if (jobCategory && (actor.userId || actor.anonymousId)) {
    const jobs = await getJobRepository().findAll({ jobCategory, activeOnly: false } satisfies JobSearchFilter);
    if (jobs[0]) {
      await recordJobInterestSignal({ userId: actor.userId, anonymousId: actor.anonymousId, job: jobs[0], signal: "JOB_SEARCHED" });
    }
  }
}

export interface TrackJobFilterChangedInput {
  userId?: string;
  anonymousId?: string;
  filter: Record<string, unknown>;
}

export async function trackJobFilterChangedAction(input: TrackJobFilterChangedInput): Promise<void> {
  const actor = await resolveActorIds(input.anonymousId);
  await logActivityEvent({
    userId: actor.userId,
    anonymousId: actor.anonymousId,
    eventType: "job_filter_changed",
    entityType: "job",
    metadata: { filter: input.filter },
  });
}

export interface TrackJobViewedInput {
  jobId: string;
  userId?: string;
  anonymousId?: string;
  matchScore?: number;
}

/** 채용공고 상세 조회 (JOB_VIEWED). Career Interest 반영 + Lead 재계산까지 한 번에 처리한다. */
export async function trackJobViewedAction(input: TrackJobViewedInput): Promise<void> {
  const job = await getJobRepository().findById(input.jobId);
  if (!job) return;
  const actor = await resolveActorIds(input.anonymousId);

  await logActivityEvent({
    userId: actor.userId,
    anonymousId: actor.anonymousId,
    eventType: "job_detail_viewed",
    entityType: "job",
    entityId: job.id,
    metadata: buildJobMetadata(job, { matchScore: input.matchScore }),
  });

  await recordJobInterestSignal({ userId: actor.userId, anonymousId: actor.anonymousId, job, signal: "JOB_VIEWED" });
  if (actor.userId) await recalculateLeadScore(actor.userId);
}

export interface TrackJobApplyClickInput {
  jobId: string;
  userId?: string;
  anonymousId?: string;
}

/** [지원하러 가기] 클릭 (JOB_APPLY_CLICKED). sourceUrl로 이동하기 직전에 호출한다. */
export async function trackJobApplyClickAction(input: TrackJobApplyClickInput): Promise<void> {
  const job = await getJobRepository().findById(input.jobId);
  if (!job) return;
  const actor = await resolveActorIds(input.anonymousId);

  await logActivityEvent({
    userId: actor.userId,
    anonymousId: actor.anonymousId,
    eventType: "job_apply_clicked",
    entityType: "job",
    entityId: job.id,
    metadata: buildJobMetadata(job),
  });

  await recordJobInterestSignal({ userId: actor.userId, anonymousId: actor.anonymousId, job, signal: "JOB_APPLY_CLICKED" });
  if (actor.userId) await recalculateLeadScore(actor.userId);
}

export interface TrackJobRecommendationInput {
  jobId: string;
  userId?: string;
  anonymousId?: string;
  matchScore?: number;
  context?: string;
}

export async function trackJobRecommendationViewedAction(input: TrackJobRecommendationInput): Promise<void> {
  const job = await getJobRepository().findById(input.jobId);
  if (!job) return;
  const actor = await resolveActorIds(input.anonymousId);
  await logActivityEvent({
    userId: actor.userId,
    anonymousId: actor.anonymousId,
    eventType: "job_recommendation_viewed",
    entityType: "job",
    entityId: job.id,
    metadata: buildJobMetadata(job, { matchScore: input.matchScore, context: input.context }),
  });
}

export async function trackJobRecommendationClickedAction(input: TrackJobRecommendationInput): Promise<void> {
  const job = await getJobRepository().findById(input.jobId);
  if (!job) return;
  const actor = await resolveActorIds(input.anonymousId);
  await logActivityEvent({
    userId: actor.userId,
    anonymousId: actor.anonymousId,
    eventType: "job_recommendation_clicked",
    entityType: "job",
    entityId: job.id,
    metadata: buildJobMetadata(job, { matchScore: input.matchScore, context: input.context }),
  });
}

export interface ToggleJobBookmarkInput {
  jobId: string;
  action: "add" | "remove";
}

/**
 * 회원 전용 찜 토글. userId는 파라미터로 받지 않고 항상 서버 세션에서 도출한다
 * (클라이언트가 임의의 userId를 넘겨 타인의 찜 목록을 조작하는 것을 방지).
 * 비회원은 이 액션을 호출하지 않고 localStorage(job-bookmark-local.ts)를 사용한다.
 */
export async function toggleJobBookmarkAction(input: ToggleJobBookmarkInput): Promise<{ bookmarked: boolean }> {
  const user = await requireSessionUser();
  const job = await getJobRepository().findById(input.jobId);
  if (!job) throw new Error("존재하지 않는 채용공고입니다.");

  const repo = getJobBookmarkRepository();
  if (input.action === "add") {
    await repo.add(user.id, input.jobId);
    await logActivityEvent({
      userId: user.id,
      eventType: "job_bookmarked",
      entityType: "job",
      entityId: job.id,
      metadata: buildJobMetadata(job),
    });
    await recordJobInterestSignal({ userId: user.id, job, signal: "JOB_BOOKMARKED" });
  } else {
    await repo.remove(user.id, input.jobId);
    await logActivityEvent({
      userId: user.id,
      eventType: "job_unbookmarked",
      entityType: "job",
      entityId: job.id,
      metadata: buildJobMetadata(job),
    });
  }

  await recalculateLeadScore(user.id);
  return { bookmarked: input.action === "add" };
}

export interface TrackAnonymousBookmarkInput {
  anonymousId: string;
  jobId: string;
  action: "add" | "remove";
}

/**
 * 비회원 찜 토글 시 호출한다 (실제 저장은 클라이언트 localStorage, job-bookmark-local.ts).
 * 여기서는 Activity Event 기록과 Career Interest 반영만 수행한다.
 */
export async function trackAnonymousJobBookmarkAction(input: TrackAnonymousBookmarkInput): Promise<void> {
  const job = await getJobRepository().findById(input.jobId);
  if (!job) return;

  await logActivityEvent({
    anonymousId: input.anonymousId,
    eventType: input.action === "add" ? "job_bookmarked" : "job_unbookmarked",
    entityType: "job",
    entityId: job.id,
    metadata: buildJobMetadata(job),
  });

  if (input.action === "add") {
    await recordJobInterestSignal({ anonymousId: input.anonymousId, job, signal: "JOB_BOOKMARKED" });
  }
}

/** 로그인 직후 localStorage에 쌓여있던 비회원 찜 jobId들을 현재 로그인 사용자에게 병합한다. */
export async function mergeLocalJobBookmarksAction(jobIds: string[]): Promise<number> {
  if (jobIds.length === 0) return 0;
  const user = await requireSessionUser();
  return getJobBookmarkRepository().mergeJobIds(user.id, jobIds);
}

/** 현재 로그인 사용자 기준으로만 조회한다 (타인의 찜 여부 조회 차단). */
export async function isJobBookmarkedAction(jobId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return getJobBookmarkRepository().isBookmarked(user.id, jobId);
}

/** 현재 로그인 사용자 기준으로만 조회한다 (타인의 찜 목록 조회 차단). */
export async function getUserJobBookmarkIdsAction(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const bookmarks = await getJobBookmarkRepository().findAllByUser(user.id);
  return bookmarks.map((b) => b.jobId);
}

/** 채용공고 큐레이션 섹션 - 탭별 큐레이션 데이터 조회 */
export async function getJobCurationAction(tab: JobCurationTab): Promise<JobCurationResult> {
  const user = await requireSessionUser();
  return getJobCuration(user.id, tab);
}

/** 채용공고 큐레이션 섹션 - 탭 조회 트래킹 */
export async function trackCurationTabViewedAction(input: { tab: JobCurationTab }): Promise<void> {
  const user = await requireSessionUser();
  await logActivityEvent({
    userId: user.id,
    eventType: "curation_tab_viewed",
    entityType: "job",
    metadata: { tab: input.tab },
  });
}

/** 채용공고 큐레이션 섹션 - 카드 클릭 트래킹 */
export async function trackCurationJobClickedAction(input: { tab: JobCurationTab; jobId: string }): Promise<void> {
  const user = await requireSessionUser();
  await logActivityEvent({
    userId: user.id,
    eventType: "curation_job_clicked",
    entityType: "job",
    entityId: input.jobId,
    metadata: { tab: input.tab },
  });
}
