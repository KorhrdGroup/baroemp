import type { CareerProfile, Job, MatchReasonDetail } from "@/types";
import { toJobCategoryPatterns } from "@/lib/jobs/job-category-groups";

export type JobMatchGrade = "A" | "B" | "C" | "D";

export interface JobMatchDetail {
  jobId: string;
  score: number;
  grade: JobMatchGrade;
  reasons: MatchReasonDetail[];
  /** "이 공고와 내 조건 비교"에서 그대로 사용하는 3단계 분류. */
  fulfilled: string[];
  needsCheck: string[];
  lacking: string[];
  /** reasons에 포함되지 않은, 점수에 반영되지 않는 감점/부족 요인만 모은 리스트 (Occupation 카드와 동일한 표현 방식). */
  missingConditions: string[];
}

function toGrade(score: number): JobMatchGrade {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 35) return "C";
  return "D";
}

/**
 * Job ↔ Career Matching (Job Detail 전용, 개별 공고 단위 상세 스코어).
 *
 * matchingEngine.matchJobsForProfile()는 "다건 중 상위 N건 추천"에 최적화되어 있어
 * 감점/부족 사유를 반환하지 않는다. Job Detail에서는 "왜 이 점수인지, 무엇이 부족한지"를
 * 함께 보여줘야 하므로 이 함수를 별도로 둔다 (같은 가중치 철학을 공유한다).
 *
 * 비회원(anonymous)은 career_profiles에 저장된 프로필이 없으므로 profile이 undefined일 수 있다.
 * 이 경우 null을 반환해 호출부가 "매칭 점수 없음"으로 처리하게 한다.
 */
export function evaluateJobFit(profile: CareerProfile | undefined | null, job: Job): JobMatchDetail | null {
  if (!profile) return null;

  const reasons: MatchReasonDetail[] = [];
  const fulfilled: string[] = [];
  const needsCheck: string[] = [];
  const lacking: string[] = [];

  /*
   * 프로필의 희망 직종은 'care_worker' 같은 묶음 key(온보딩)이거나 6자리 직종코드(진단)인데,
   * job.jobCategory는 워크넷 6자리 코드다. 그대로 비교하면 절대 일치하지 않으므로
   * /jobs 검색과 같은 방식으로 코드 앞자리로 바꿔 훑는다.
   */
  const desiredCategoryPrefixes = toJobCategoryPatterns(profile.desiredJobCategories ?? []);
  if (desiredCategoryPrefixes.some((prefix) => job.jobCategory.startsWith(prefix))) {
    reasons.push({ ruleKey: "job_category", label: "희망 직종 일치", score: 30 });
    fulfilled.push("희망 직종");
  }

  if (profile.region && profile.region === job.region) {
    reasons.push({ ruleKey: "region", label: "희망 지역 일치", score: 20 });
    fulfilled.push("희망 지역");
  } else if (profile.region) {
    needsCheck.push("근무지역(희망 지역과 다름)");
  }

  const desiredMin = profile.desiredSalaryMin;
  const desiredMax = profile.desiredSalaryMax;
  if (desiredMin !== undefined || desiredMax !== undefined) {
    const jobMin = job.salaryMin ?? 0;
    const jobMax = job.salaryMax ?? job.salaryMin ?? Infinity;
    const overlaps = jobMax >= (desiredMin ?? 0) && jobMin <= (desiredMax ?? Infinity);
    if (overlaps) {
      reasons.push({ ruleKey: "salary", label: "희망 급여 범위 일치", score: 15 });
      fulfilled.push("급여 조건");
    } else {
      lacking.push("희망 급여 범위와 차이가 있음");
    }
  }

  if (profile.desiredWorkTypes?.includes(job.workType)) {
    reasons.push({ ruleKey: "work_type", label: "희망 근무형태 일치", score: 10 });
    fulfilled.push("근무형태");
  }

  const isCareerOpen = profile.employmentStatus === "career_break" || profile.employmentStatus === "unemployed";
  if (job.isBeginnerFriendly && isCareerOpen) {
    reasons.push({ ruleKey: "beginner_friendly", label: "신입가능 + 재취업 준비 중", score: 15 });
    fulfilled.push("경력무관/신입가능");
  } else if (job.careerRequirement === "experienced" && !profile.careerYears) {
    lacking.push("경력 조건 (경력직 우대 공고)");
  }

  const requiresDriving = job.tags.some((tag) => tag.includes("운전")) || job.preferentialCodes?.includes("14");
  if (requiresDriving) {
    if (profile.canDrive) {
      reasons.push({ ruleKey: "can_drive", label: "운전 가능 우대 조건 충족", score: 10 });
      fulfilled.push("운전 가능 여부");
    } else {
      needsCheck.push("운전 가능 여부");
    }
  }

  const tagOverlap = (profile.interestTags ?? []).filter((tag) => job.tags.includes(tag));
  if (tagOverlap.length > 0) {
    reasons.push({ ruleKey: "interest_tag", label: "관심 태그 일치", score: Math.min(16, 8 * tagOverlap.length) });
    fulfilled.push(...tagOverlap);
  }

  if (job.preferentialCodes?.includes("B") && (profile.ageGroup === "50s" || profile.ageGroup === "60s")) {
    reasons.push({ ruleKey: "midlife_preferential", label: "(준)고령자 우대 조건 일치", score: 8 });
    fulfilled.push("연령 우대 조건");
  }

  const heldSet = new Set(profile.heldQualifications ?? []);
  const missingQualifications = job.preferredQualifications.filter((q) => !heldSet.has(q));
  if (job.preferredQualifications.length > 0) {
    if (missingQualifications.length === 0) {
      reasons.push({ ruleKey: "qualification", label: "필요 자격 보유", score: 12 });
      fulfilled.push("필요 자격");
    } else {
      lacking.push(...missingQualifications);
    }
  }

  const rawScore = reasons.reduce((sum, r) => sum + r.score, 0);
  const score = Math.max(0, Math.min(100, rawScore));

  return {
    jobId: job.id,
    score,
    grade: toGrade(score),
    reasons: reasons.sort((a, b) => b.score - a.score),
    fulfilled: [...new Set(fulfilled)],
    needsCheck: [...new Set(needsCheck)],
    lacking: [...new Set(lacking)],
    missingConditions: [...new Set(lacking)],
  };
}
