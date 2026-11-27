import type { FeaturedJobsTab } from "@/features/home-draft/featured-jobs-panel";
import { getJobRepository, getSupportProgramRepository } from "@/lib/repositories";
import { CAREER_RELEVANCE_THRESHOLD } from "@/lib/support/career-relevance";
import type { Job, JobSearchFilter, SupportProgram } from "@/types";

/*
  시안 홈(/draft, /draft2)이 함께 쓰는 공고 읽기. 최근 올라온 공고 8건을 받아 프로세스 안에 10분 기억한다.
  공고 수는 화면에 쓰지 않아 세지 않는다.
*/
const HOME_JOBS_TTL_MS = 10 * 60 * 1000;
const HOME_JOBS_LIMIT = 8;
let homeJobsCache: { at: number; items: Job[] } | null = null;

export async function loadHomeJobs(): Promise<{ items: Job[] }> {
  if (homeJobsCache && Date.now() - homeJobsCache.at < HOME_JOBS_TTL_MS) return homeJobsCache;
  try {
    const { items } = await getJobRepository().search({
      activeOnly: true,
      page: 1,
      pageSize: HOME_JOBS_LIMIT,
      sort: "latest",
      withTotal: false,
    });
    homeJobsCache = { at: Date.now(), items };
    return homeJobsCache;
  } catch (err) {
    console.error("[home] 최근 공고 조회 실패", err);
    return homeJobsCache ?? { items: [] };
  }
}

/*
  첫 줄 공고 판의 탭. 회원 조건 없이 고를 수 있는 것만 둔다 - 비로그인에게도 같은 판이 보인다.
  탭마다 아홉 건(세 장씩 세 번 넘김)을 받고 건수는 세지 않는다(withTotal: false). 위 최근 공고와 같이 10분 기억한다.
*/
const FEATURED_TABS: { key: string; label: string; emoji: string; href: string; filter: Partial<JobSearchFilter> }[] = [
  { key: "closing", label: "마감 임박", emoji: "⏰", href: "/jobs?closingSoon=1&sort=deadline", filter: { closingWithinDays: 7, sort: "deadline" } },
  { key: "beginner", label: "경력 없어도 돼요", emoji: "🙌", href: "/jobs?beginner=1", filter: { isBeginnerFriendly: true, sort: "latest" } },
  /*
    "급여 높은 순"을 두려 했으나 지역·직종 없이 급여로 줄 세우는 조회가 8초 제한에 걸린다(색인 없음).
    대신 공고가 가장 많은 요양보호사를 둔다.
  */
  { key: "care", label: "요양보호사", emoji: "🤝", href: "/jobs?category=care_worker&sort=latest", filter: { jobCategoryPatterns: ["5501"], sort: "latest" } },
  // 아래 직종 탭은 중장년 공고가 많은 직종. 코드 앞자리는 일자리찾기 직종 필터(job-category-groups.ts)와 같다.
  // 경비·보안도 두었으나 진행 중 공고가 가장 적어(1,839건, 2026-11-24) 뺐다.
  { key: "cleaning", label: "시설관리·미화", emoji: "🧹", href: "/jobs?category=facility_cleaning&sort=latest", filter: { jobCategoryPatterns: ["561", "702"], sort: "latest" } },
  { key: "cook", label: "조리·주방", emoji: "🍳", href: "/jobs?category=cook&sort=latest", filter: { jobCategoryPatterns: ["531", "532"], sort: "latest" } },
];
const FEATURED_PER_TAB = 9;
let featuredCache: { at: number; tabs: FeaturedJobsTab[] } | null = null;

export async function loadFeaturedTabs(): Promise<FeaturedJobsTab[]> {
  if (featuredCache && Date.now() - featuredCache.at < HOME_JOBS_TTL_MS) return featuredCache.tabs;
  const repo = getJobRepository();
  const tabs = await Promise.all(
    FEATURED_TABS.map(async ({ filter, ...tab }) => {
      try {
        const { items } = await repo.search({ activeOnly: true, page: 1, pageSize: FEATURED_PER_TAB, withTotal: false, ...filter });
        return { ...tab, jobs: items };
      } catch (err) {
        console.error(`[home] 공고 판 "${tab.label}" 조회 실패`, err);
        return { ...tab, jobs: [] as Job[] };
      }
    }),
  );
  // 하나라도 비었으면 기억하지 않는다 - 잠깐 실패한 탭이 10분 동안 빠져 있지 않게.
  if (tabs.every((t) => t.jobs.length > 0)) featuredCache = { at: Date.now(), tabs };
  return featuredCache?.tabs ?? tabs;
}

/*
  /draft2 첫 화면의 "진행 중 공고 N건". 일자리찾기 목록이 세는 것과 같은 조회라 10분 기억한다.
  세다가 실패하면 null - 숫자 줄만 감춘다.
*/
let activeCountCache: { at: number; total: number } | null = null;

export async function loadActiveJobCount(): Promise<number | null> {
  if (activeCountCache && Date.now() - activeCountCache.at < HOME_JOBS_TTL_MS) return activeCountCache.total;
  try {
    const { total } = await getJobRepository().search({ activeOnly: true, page: 1, pageSize: 1, withTotal: true });
    if (typeof total !== "number") return activeCountCache?.total ?? null;
    activeCountCache = { at: Date.now(), total };
    return total;
  } catch (err) {
    console.error("[home] 진행 중 공고 수 조회 실패", err);
    return activeCountCache?.total ?? null;
  }
}

/*
  /draft2 공고 판 옆 "중장년 지원사업". 지원금 찾기 목록과 같은 기준(경력 관련도 20 이상)에서 이름 · 기관 · 요약에
  "중장년"이 들어간 것(2026-11 기준 19건) 가운데 사업주 대상을 빼고 여섯 건.
  등록일 · 마감일은 대부분 비었거나 한꺼번에 가져온 날이라 쓰지 않는다. 실패하면 빈 목록 - 그 칸만 안내 글로 바뀐다.
*/
let midlifeSupportCache: { at: number; items: SupportProgram[] } | null = null;

export async function loadMidlifeSupportPrograms(): Promise<SupportProgram[]> {
  if (midlifeSupportCache && Date.now() - midlifeSupportCache.at < HOME_JOBS_TTL_MS) return midlifeSupportCache.items;
  try {
    const { items } = await getSupportProgramRepository().search({
      activeOnly: true,
      minCareerRelevanceScore: CAREER_RELEVANCE_THRESHOLD,
      keyword: "중장년",
      sort: "latest",
      page: 1,
      pageSize: 12,
    });
    const forPeople = items.filter((p) => p.audience !== "business").slice(0, 6);
    midlifeSupportCache = { at: Date.now(), items: forPeople };
    return forPeople;
  } catch (err) {
    console.error("[home] 중장년 지원사업 조회 실패", err);
    return midlifeSupportCache?.items ?? [];
  }
}
