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
  /** 나를 채용한 회사가 활용할 수 있는 고용지원 (기업 대상 제도, 참고 안내) */
  employerPrograms: SupportProgram[];
}

/**
 * 지금 유효한 지원금 매칭 결과 - 마지막으로 끝낸 진단에서 계산한 것만.
 * match_results 는 회원 · 제도마다 한 줄이라, 다시 진단하면 이번에 걸린 제도만 갱신되고
 * 이번에는 걸리지 않은 제도의 예전 줄(예: 나이를 바꾸기 전 "가능성 높음")이 그대로 남는다.
 * 마지막 진단을 시작한 뒤에 계산된 줄만 남겨 그런 줄을 뺀다.
 */
export async function findCurrentSupportMatchResults(source: { userId?: string; anonymousId?: string }): Promise<MatchResult[]> {
  const sourceId = source.userId ?? source.anonymousId ?? "";
  if (!sourceId) return [];
  const [sessions, matchResults] = await Promise.all([
    getSupportAssessmentSessionRepository().findAll(
      source.userId ? { userId: source.userId, status: "completed" } : { anonymousId: source.anonymousId, status: "completed" },
    ),
    getMatchResultRepository().findAll({ sourceId, targetType: "support_program" }),
  ]);
  const lastStartedAt = Math.max(0, ...sessions.map((s) => Date.parse(s.startedAt) || 0));
  return matchResults.filter((m) => (Date.parse(m.computedAt) || 0) >= lastStartedAt);
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
    return { sessionId, gradeCounts: { HIGH: 0, MEDIUM: 0, CHECK_REQUIRED: 0, LOW: 0 }, totalCount: 0, categories: [], employerPrograms: [] };
  }

  const matchResults = await findCurrentSupportMatchResults({ userId: session.userId, anonymousId: session.anonymousId });
  // 전체 테이블(1만+건)은 PostgREST 기본 1,000행 상한에 걸리므로,
  // 매칭 계산(completeSupportAssessment)과 동일한 "취업 관련" 필터로 조회해 매칭된 제도를 전부 커버한다.
  const allPrograms = await getSupportProgramRepository().findAll({
    activeOnly: true,
    minCareerRelevanceScore: CAREER_RELEVANCE_THRESHOLD,
  });
  const programById = new Map(allPrograms.map((p) => [p.id, p]));

  const gradeCounts: Record<SupportEligibilityGrade, number> = { HIGH: 0, MEDIUM: 0, CHECK_REQUIRED: 0, LOW: 0 };
  const byCategory = new Map<SupportCategory, Array<{ program: SupportProgram; matchResult: MatchResult }>>();

  for (const matchResult of matchResults) {
    const program = programById.get(matchResult.targetId);
    if (!program) continue;
    // 과거 세션 호환: 기업 전용 제도가 매칭에 저장돼 있어도 개인 결과에는 노출하지 않는다.
    if ((program.audience ?? "personal") === "business") continue;
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

  // "나를 채용한 회사가 받을 수 있는 고용지원" - 기업 대상 취업 관련 제도 상위 5건 (참고 안내용)
  const employerPrograms = allPrograms
    .filter((p) => p.isActive !== false && (p.audience === "business" || p.audience === "both"))
    .filter((p) => (p.careerRelevanceScore ?? 0) >= 30)
    .sort((a, b) => (b.careerRelevanceScore ?? 0) - (a.careerRelevanceScore ?? 0))
    .slice(0, 5);

  return { sessionId, gradeCounts, totalCount: matchResults.length, categories, employerPrograms };
}

export interface SupportShowcaseCategory {
  category: SupportCategory;
  label: string;
  programs: Pick<SupportProgram, "id" | "title" | "organization" | "summary" | "supportAmountText">[];
}

export interface SupportShowcase {
  /** 지금 찾아볼 수 있는(활성 · 취업 관련) 지원제도 수. */
  totalCount: number;
  categories: SupportShowcaseCategory[];
}

const SHOWCASE_CATEGORIES: SupportCategory[] = ["employment", "training", "living"];

/**
 * /support 소개 화면의 "분야별 대표 지원제도" 구역. 읽기만 한다(조회 기록을 남기지 않는다).
 * 개수는 결과 화면과 같은 기준(활성 · 취업 관련도 기준 이상), 카드는 분야마다 개인 대상 최신 6개.
 */
export async function getSupportShowcase(): Promise<SupportShowcase> {
  const repo = getSupportProgramRepository();
  const base = { minCareerRelevanceScore: CAREER_RELEVANCE_THRESHOLD, sort: "latest" as const };
  const [all, ...perCategory] = await Promise.all([
    repo.search({ ...base, pageSize: 1 }),
    ...SHOWCASE_CATEGORIES.map((category) => repo.search({ ...base, category, pageSize: 20 })),
  ]);
  return {
    totalCount: all.total,
    categories: SHOWCASE_CATEGORIES.map((category, i) => ({
      category,
      label: SUPPORT_CATEGORY_LABELS[category] ?? category,
      programs: perCategory[i].items
        .filter((p) => (p.audience ?? "personal") !== "business")
        .slice(0, 6)
        .map(({ id, title, organization, summary, supportAmountText }) => ({ id, title, organization, summary, supportAmountText })),
    })).filter((c) => c.programs.length > 0),
  };
}
