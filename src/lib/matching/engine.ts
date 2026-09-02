import type {
  CareerContent,
  CareerProfile,
  Job,
  MatchReasonDetail,
  MatchResult,
  SupportProgram,
} from "@/types";
import { evaluateRecommendationRuleRows } from "./rule-evaluator";
import { toJobCategoryPatterns } from "@/lib/jobs/job-category-groups";

/**
 * Matching Engine 인터페이스.
 *
 * 양방향 매칭을 모두 지원한다.
 *  - USER -> CONTENT/JOB/SUPPORT_PROGRAM: 사용자 프로필 기준으로 추천 대상을 찾는다.
 *  - CONTENT -> USERS: 신규 콘텐츠 등록 시, 기존 사용자 프로필 전체를 재분석해 잠재고객을 추출한다.
 *
 * STEP 1에서는 규칙 기반 Mock 점수 계산만 구현하지만,
 * 이후 AI/ML 기반 엔진으로 교체할 때도 이 인터페이스는 그대로 유지할 수 있도록 설계했다.
 */
export interface MatchingEngine {
  matchContentsForProfile(profile: CareerProfile, contents: CareerContent[], limit?: number): MatchResult[];
  matchJobsForProfile(profile: CareerProfile, jobs: Job[], limit?: number): MatchResult[];
  matchSupportProgramsForProfile(
    profile: CareerProfile,
    programs: SupportProgram[],
    limit?: number,
  ): MatchResult[];
  /** 신규 콘텐츠 -> 잠재고객 추출 (역방향 매칭) */
  matchProfilesForContent(content: CareerContent, profiles: CareerProfile[], limit?: number): MatchResult[];
}

function overlapCount<T>(a: T[] = [], b: T[] = []): number {
  const setB = new Set(b);
  return a.filter((v) => setB.has(v)).length;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toMatchResult(
  sourceId: string,
  sourceType: MatchResult["sourceType"],
  targetId: string,
  targetType: MatchResult["targetType"],
  reasons: MatchReasonDetail[],
): MatchResult {
  const rawScore = reasons.reduce((sum, r) => sum + r.score, 0);
  const score = Math.max(0, Math.min(100, rawScore));
  return {
    id: `match-${sourceType}-${sourceId}-${targetType}-${targetId}`,
    sourceType,
    sourceId,
    targetType,
    targetId,
    score,
    reasons,
    computedAt: nowIso(),
  };
}

/**
 * 간단한 규칙 기반 Mock Matching Engine.
 * 향후 이 클래스를 AI 기반 구현체로 바꾸더라도 인터페이스는 동일하게 유지된다.
 */
export class SimpleRuleBasedMatchingEngine implements MatchingEngine {
  matchContentsForProfile(profile: CareerProfile, contents: CareerContent[], limit = 5): MatchResult[] {
    const results = contents
      .filter((content) => content.status === "published")
      .map((content) => {
        const reasons: MatchReasonDetail[] = [];
        const rules = content.recommendationRules;

        // 1) DB Rule 행 우선 평가 (관리자 설정형)
        if (content.recommendationRuleRows?.length) {
          reasons.push(...evaluateRecommendationRuleRows(profile, content.recommendationRuleRows));
        }

        // 2) 레거시 객체형 규칙 (하위호환)
        if (profile.ageGroup && rules.targetAgeGroups?.includes(profile.ageGroup)) {
          reasons.push({ ruleKey: "age_group", label: "연령대 일치", score: 20 });
        } else if (
          profile.ageGroup &&
          content.targetAgeGroups.length > 0 &&
          content.targetAgeGroups.includes(profile.ageGroup)
        ) {
          reasons.push({ ruleKey: "age_group_target", label: "대상 연령대 포함", score: 15 });
        }

        const jobCategoryOverlap = overlapCount(
          profile.desiredJobCategories,
          rules.targetJobCategories ?? [],
        );
        if (jobCategoryOverlap > 0) {
          reasons.push({ ruleKey: "job_category", label: "희망 직종 연관", score: 25 * jobCategoryOverlap });
        }

        const tagOverlap = overlapCount(profile.interestTags, rules.matchTags ?? content.tags);
        if (tagOverlap > 0) {
          reasons.push({ ruleKey: "interest_tag", label: "관심 태그 일치", score: 10 * tagOverlap });
        }

        if (
          rules.minCareerBreakMonths !== undefined &&
          (profile.careerBreakMonths ?? 0) >= rules.minCareerBreakMonths
        ) {
          reasons.push({ ruleKey: "career_break", label: "경력단절 기간 조건 충족", score: 10 });
        }

        const excluded = rules.excludeIfHeldQualificationIds?.some((qid) =>
          profile.heldQualifications?.includes(qid),
        );
        if (excluded) {
          reasons.push({ ruleKey: "already_qualified", label: "이미 보유한 자격 (제외 대상)", score: -50 });
        }

        if (rules.weight) {
          reasons.push({ ruleKey: "base_weight", label: "콘텐츠 기본 가중치", score: rules.weight * 2 });
        }

        return toMatchResult(profile.userId, "user", content.id, "content", reasons);
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  matchJobsForProfile(profile: CareerProfile, jobs: Job[], limit = 5): MatchResult[] {
    const results = jobs
      .filter((job) => job.status === "published")
      .map((job) => {
        const reasons: MatchReasonDetail[] = [];

        // 희망 직종은 묶음 key/6자리 코드가 섞여 있으므로 코드 앞자리로 비교한다 (evaluateJobFit과 동일).
        if (toJobCategoryPatterns(profile.desiredJobCategories ?? []).some((prefix) => job.jobCategory.startsWith(prefix))) {
          reasons.push({ ruleKey: "job_category", label: "희망 직종 일치", score: 35 });
        }
        if (profile.region && profile.region === job.region) {
          reasons.push({ ruleKey: "region", label: "희망 지역 일치", score: 20 });
        }
        if (profile.desiredWorkTypes?.includes(job.workType)) {
          reasons.push({ ruleKey: "work_type", label: "희망 근무형태 일치", score: 10 });
        }
        if (job.isBeginnerFriendly && (profile.employmentStatus === "career_break" || profile.employmentStatus === "unemployed")) {
          reasons.push({ ruleKey: "beginner_friendly", label: "신입가능 + 재취업 준비 중", score: 15 });
        }
        if (profile.canDrive && job.tags.some((tag) => tag.includes("운전"))) {
          reasons.push({ ruleKey: "can_drive", label: "운전 가능 우대", score: 10 });
        }
        const tagOverlap = overlapCount(profile.interestTags, job.tags);
        if (tagOverlap > 0) {
          reasons.push({ ruleKey: "interest_tag", label: "관심 태그 일치", score: 8 * tagOverlap });
        }

        return toMatchResult(profile.userId, "user", job.id, "job", reasons);
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  matchSupportProgramsForProfile(
    profile: CareerProfile,
    programs: SupportProgram[],
    limit = 5,
  ): MatchResult[] {
    const results = programs
      .filter((program) => program.status === "published")
      .map((program) => {
        const reasons: MatchReasonDetail[] = [];

        if (profile.ageGroup && program.targetAgeGroups.includes(profile.ageGroup)) {
          reasons.push({ ruleKey: "age_group", label: "연령대 일치", score: 25 });
        }
        if (profile.region && program.targetRegions?.includes(profile.region)) {
          reasons.push({ ruleKey: "region", label: "지역 일치", score: 15 });
        }
        const categoryOverlap = overlapCount(
          profile.desiredJobCategories,
          program.relatedJobCategories ?? [],
        );
        if (categoryOverlap > 0) {
          reasons.push({ ruleKey: "job_category", label: "희망 직종 연관", score: 20 * categoryOverlap });
        }
        const tagOverlap = overlapCount(profile.interestTags, program.tags);
        if (tagOverlap > 0) {
          reasons.push({ ruleKey: "interest_tag", label: "관심 태그 일치", score: 10 * tagOverlap });
        }

        return toMatchResult(profile.userId, "user", program.id, "support_program", reasons);
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  matchProfilesForContent(content: CareerContent, profiles: CareerProfile[], limit = 20): MatchResult[] {
    const results = profiles
      .map((profile) => {
        // 방향만 반대일 뿐, 동일한 규칙 세트를 재사용해 일관성을 유지한다.
        const [contentMatch] = this.matchContentsForProfile(profile, [content], 1);
        if (!contentMatch) return null;
        return toMatchResult(content.id, "content", profile.userId, "user", contentMatch.reasons);
      })
      .filter((result): result is MatchResult => result !== null && result.score > 0)
      .sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }
}

/** 앱 전역에서 사용하는 싱글턴. 향후 AI 기반 구현체로 간단히 교체 가능. */
export const matchingEngine: MatchingEngine = new SimpleRuleBasedMatchingEngine();
