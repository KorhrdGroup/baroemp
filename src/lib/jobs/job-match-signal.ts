import type { CareerProfile, Job, JobMatchSignal } from "@/types";
import { toJobCategoryPatterns } from "./job-category-groups";

/**
 * 프로필에서 점수 계산에 쓰는 값만 추린다.
 * DB 함수 search_jobs_scored 와 mock 저장소가 같은 재료로 같은 순서를 만들기 위한 모양이다.
 */
export function toJobMatchSignal(profile: CareerProfile): JobMatchSignal {
  return {
    desiredCategoryPrefixes: toJobCategoryPatterns(profile.desiredJobCategories ?? []),
    region: profile.region,
    desiredSalaryMin: profile.desiredSalaryMin,
    desiredSalaryMax: profile.desiredSalaryMax,
    desiredWorkTypes: profile.desiredWorkTypes ?? [],
    isCareerOpen: profile.employmentStatus === "career_break" || profile.employmentStatus === "unemployed",
    canDrive: Boolean(profile.canDrive),
    interestTags: profile.interestTags ?? [],
    isMidlifeAge: profile.ageGroup === "50s" || profile.ageGroup === "60s",
    heldQualifications: profile.heldQualifications ?? [],
  };
}

/**
 * 순서만 정하는 점수. 가중치는 evaluateJobFit(job-match.service.ts)·search_jobs_scored(0068 마이그레이션)과
 * 같아야 한다. 셋 중 하나를 고치면 나머지도 함께 고친다.
 * "왜 이 점수인지"(reasons)는 evaluateJobFit 이 만든다. 여기서는 mock 저장소가 DB 와 같은 순서를 내게 한다.
 */
export function scoreJobBySignal(signal: JobMatchSignal, job: Job): number {
  let score = 0;
  if (signal.desiredCategoryPrefixes.some((prefix) => job.jobCategory.startsWith(prefix))) score += 30;
  if (signal.region && signal.region === job.region) score += 20;
  if (signal.desiredSalaryMin !== undefined || signal.desiredSalaryMax !== undefined) {
    const jobMin = job.salaryMin ?? 0;
    const jobMax = job.salaryMax ?? job.salaryMin ?? Infinity;
    if (jobMax >= (signal.desiredSalaryMin ?? 0) && jobMin <= (signal.desiredSalaryMax ?? Infinity)) score += 15;
  }
  if (signal.desiredWorkTypes.includes(job.workType)) score += 10;
  if (job.isBeginnerFriendly && signal.isCareerOpen) score += 15;
  const requiresDriving = job.tags.some((tag) => tag.includes("운전")) || job.preferentialCodes?.includes("14");
  if (requiresDriving && signal.canDrive) score += 10;
  const tagOverlap = signal.interestTags.filter((tag) => job.tags.includes(tag)).length;
  if (tagOverlap > 0) score += Math.min(16, 8 * tagOverlap);
  if (signal.isMidlifeAge && job.preferentialCodes?.includes("B")) score += 8;
  if (job.preferredQualifications.length > 0) {
    const held = new Set(signal.heldQualifications);
    if (job.preferredQualifications.every((q) => held.has(q))) score += 12;
  }
  return Math.max(0, Math.min(100, score));
}
