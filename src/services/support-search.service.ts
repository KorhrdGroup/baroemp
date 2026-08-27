import {
  findCareerProfileByUserId,
  getMatchResultRepository,
  getSupportAssessmentSessionRepository,
  getSupportProgramRepository,
} from "@/lib/repositories";
import { SUPPORT_CATEGORY_LABELS } from "@/types";
import { CAREER_RELEVANCE_THRESHOLD } from "@/lib/support/career-relevance";
import { getAnonymousCareerSignal } from "./job-search.service";
import { evaluateSupportEligibilityBatch, type SupportMatchDetail, type SupportMatchProfile } from "./support-eligibility.service";
import type {
  CareerProfile,
  MatchResult,
  SupportCategory,
  SupportEligibilityGrade,
  SupportProgram,
  SupportSearchFilter,
} from "@/types";

export interface SupportProgramWithMatch extends SupportProgram {
  match?: SupportMatchDetail | null;
}

export interface SupportSearchParams extends SupportSearchFilter {
  userId?: string;
  anonymousId?: string;
}

export interface SupportSearchView {
  items: SupportProgramWithMatch[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 로그인 사용자는 Career Profile, 비회원은 최근 검사 신호(anonymousId)로부터
 * Support Eligibility 판정에 쓸 SupportMatchProfile을 만든다. Job Detail의
 * evaluateJobFit(getAnonymousCareerSignal(...))와 동일한 철학을 지원제도에 적용한 버전이다.
 */
export async function resolveSupportMatchProfile(
  userId?: string,
  anonymousId?: string,
): Promise<SupportMatchProfile | undefined> {
  let profile: CareerProfile | undefined;
  if (userId) profile = (await findCareerProfileByUserId(userId)) ?? undefined;
  else if (anonymousId) profile = await getAnonymousCareerSignal(anonymousId);
  if (!profile) return undefined;
  return {
    ageGroup: profile.ageGroup,
    region: profile.region,
    employmentStatus: profile.employmentStatus,
    desiredStartTiming: profile.desiredStartTiming,
    trainingWillingness: profile.isOpenToTraining ? 4 : undefined,
    heldQualifications: profile.heldQualifications,
    desiredJobCategories: profile.desiredJobCategories,
    currentJobCategory: profile.desiredJobCategories?.[0],
    careerBreak: (profile.careerBreakMonths ?? 0) > 0,
    careerBreakMonths: profile.careerBreakMonths,
  };
}

/**
 * Support Search Service (/support 목록·필터 화면용).
 *
 * job-search.service.ts와 동일한 철학: UI는 이 서비스만 호출하고, Repository/Supabase에는
 * 직접 접근하지 않는다. Career Profile(또는 비회원의 최근 검사 신호)이 있으면 결과에
 * Eligibility 매칭 등급을 함께 붙여 반환한다 — 없으면 match는 undefined로 순수 목록만 내려간다.
 */
export async function searchSupportPrograms(params: SupportSearchParams): Promise<SupportSearchView> {
  const repo = getSupportProgramRepository();
  const result = await repo.search({ minCareerRelevanceScore: CAREER_RELEVANCE_THRESHOLD, ...params });

  const profile = await resolveSupportMatchProfile(params.userId, params.anonymousId);
  let items: SupportProgramWithMatch[] = result.items;
  if (profile) {
    const detailByProgramId = await evaluateSupportEligibilityBatch(result.items, profile);
    items = result.items.map((program) => ({ ...program, match: detailByProgramId.get(program.id) ?? null }));
    if (params.sort === "recommended" || !params.sort) {
      items = [...items].sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0));
    }
  }

  return { items, total: result.total, page: result.page, pageSize: result.pageSize };
}

export interface SupportResultCategoryGroup {
  category: SupportCategory;
  label: string;
  items: Array<{ program: SupportProgram; matchResult: MatchResult }>;
}

export interface SupportResultView {
  sessionId: string;
  gradeCounts: Record<SupportEligibilityGrade, number>;
  totalCount: number;
  categories: SupportResultCategoryGroup[];
}

/**
 * /support/result/[sessionId] 결과 페이지용 뷰 모델.
 * completeSupportAssessment()가 저장한 match_results(target_type=support_program)를 읽어
 * 카테고리별로 그룹핑하고, 각 그룹 내에서는 매칭 점수 내림차순으로 정렬한다.
 */
export async function getSupportResultView(sessionId: string): Promise<SupportResultView | null> {
  const session = await getSupportAssessmentSessionRepository().findById(sessionId);
  if (!session) return null;

  const sourceId = session.userId ?? session.anonymousId ?? "";
  if (!sourceId) {
    return { sessionId, gradeCounts: { HIGH: 0, MEDIUM: 0, CHECK_REQUIRED: 0, LOW: 0 }, totalCount: 0, categories: [] };
  }

  const matchResults = await getMatchResultRepository().findAll({ sourceId, targetType: "support_program" });
  const allPrograms = await getSupportProgramRepository().findAll();
  const programById = new Map(allPrograms.map((p) => [p.id, p]));

  const gradeCounts: Record<SupportEligibilityGrade, number> = { HIGH: 0, MEDIUM: 0, CHECK_REQUIRED: 0, LOW: 0 };
  const byCategory = new Map<SupportCategory, Array<{ program: SupportProgram; matchResult: MatchResult }>>();

  for (const matchResult of matchResults) {
    const program = programById.get(matchResult.targetId);
    if (!program) continue;
    const grade = (matchResult.grade as SupportEligibilityGrade) ?? "CHECK_REQUIRED";
    gradeCounts[grade] = (gradeCounts[grade] ?? 0) + 1;

    const list = byCategory.get(program.category) ?? [];
    list.push({ program, matchResult });
    byCategory.set(program.category, list);
  }

  const categories: SupportResultCategoryGroup[] = [...byCategory.entries()]
    .map(([category, items]) => ({
      category,
      label: SUPPORT_CATEGORY_LABELS[category] ?? category,
      items: items.sort((a, b) => b.matchResult.score - a.matchResult.score),
    }))
    .sort((a, b) => b.items.length - a.items.length);

  return { sessionId, gradeCounts, totalCount: matchResults.length, categories };
}
