# 채용공고 큐레이션 섹션 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/jobs` 상단에 5개 탭(신규/마감임박/맞춤 추천/지금 지원가능/자격 따면 열리는 공고) 큐레이션 카드 섹션을 추가하고, 아래 기존 검색 리스트는 유지한다.

**Architecture:** 신규 서비스 `job-curation.service.ts`가 탭별 결과를 결정론적으로 산출(기존 evaluateJobFit·compareUserToJobRequirements·커리어갭 counterfactual 재사용). 공통 탭(신규)은 서버 컴포넌트에서 미리 렌더, 개인화 탭은 클릭 시 서버 액션 지연 로드. 개인화 계산은 후보군 500건으로 제한한다.

**Tech Stack:** Next.js 16 App Router, Server Actions, 기존 repository 레이어, tsx 검증 스크립트(vitest 없음).

**설계 문서:** `docs/superpowers/specs/2026-08-27-job-curation-section-design.md`

## Global Constraints

- 추천 수치·판정은 전부 기존 엔진의 결정론적 산출값. AI 미개입.
- 개인화 탭은 절대 전체 jobs(6만+건)를 findAll로 스캔하지 않는다 — 후보군 상한 500건.
- `/jobs`는 이미 requireUser로 로그인 필수다. 비로그인 fallback은 불필요하고, 프로필/분석 부족 fallback만 처리한다 (설계 6절의 비로그인 항목은 이 사실로 대체됨).
- 개인화 서버 액션은 requireSessionUser 패턴 — 클라이언트에서 userId를 받지 않는다.
- 큐레이션 실패는 해당 탭 빈 상태로만 표시, 목록/검색에 영향 없음.
- UI 문구 한국어, 기존 brand-blue 스타일. 커밋 메시지 한국어 한 줄.
- 워킹트리에 무관한 변경이 있으므로 각 태스크는 명시된 파일만 git add.

---

### Task 1: 큐레이션 서비스 + 후보군 헬퍼 + 검증 스크립트

**Files:**
- Modify: `src/types/job.ts` (파일 끝에 큐레이션 타입 추가)
- Modify: `src/services/career-gap-engine.service.ts` (`buildHypotheticalProfile` 함수에 export 추가 — 시그니처 변경 없음)
- Create: `src/services/job-curation.service.ts`
- Test: `scripts/check-job-curation.ts`

**Interfaces:**
- Consumes: `evaluateJobFit(profile, job): JobMatchDetail | null` (job-match.service, grade "A"|"B"|"C"|"D"), `compareUserToJobRequirements(userId, job): Promise<JobRequirementComparisonItem[]>` (job-requirement-comparison.service, item.jobLevel/"REQUIRED", item.userStatus/"NOT_SATISFIED"), `listCareerGapSummariesForUser(userId, limit)` + `getCareerGapResult(analysisId)` (career-gap-engine.service), `findCareerProfileByUserId(userId)` (`@/lib/repositories`), `getJobRepository().search(filter)` (JobSearchFilter: keyword/region/jobCategory/activeOnly/closingSoon/sort/page/pageSize — 실제 필드는 src/types/job.ts 118~140행 확인)
- Produces:
  - 타입 `JobCurationTab = "new" | "closing_soon" | "matched" | "ready_to_apply" | "unlockable"`, `JobCurationState = "READY" | "NEEDS_PROFILE" | "NEEDS_ANALYSIS" | "EMPTY"`, `JobCurationItem { job: Job; matchScore?: number; matchGrade?: string; unlockRequirementName?: string }`, `JobCurationResult { tab: JobCurationTab; state: JobCurationState; items: JobCurationItem[] }`
  - `getJobCuration(userId: string, tab: JobCurationTab): Promise<JobCurationResult>` — Task 2가 import
  - `getCandidateJobsForUser(userId: string, limit?: number): Promise<Job[]>` — Task 5가 import

- [ ] **Step 1: 검증 스크립트 작성 (실패 확인용)**

`scripts/check-job-curation.ts`:

```typescript
/**
 * job-curation.service 검증 스크립트 (mock 모드).
 * 실행: DATA_SOURCE_MODE=mock npx tsx scripts/check-job-curation.ts
 */
import { listAdminUsersPaged } from "@/services/admin-user-list.service";
import { getJobCuration } from "@/services/job-curation.service";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

async function main() {
  if (process.env.DATA_SOURCE_MODE !== "mock") {
    console.error("DATA_SOURCE_MODE=mock 으로 실행하세요.");
    process.exit(1);
  }
  const users = await listAdminUsersPaged({ pageSize: 1 });
  const userId = users.items[0]?.id;
  assert(userId, "mock 사용자 존재");

  const newTab = await getJobCuration(userId, "new");
  assert(newTab.state === "READY" || newTab.state === "EMPTY", `신규 탭 상태 (got ${newTab.state})`);
  assert(newTab.items.length <= 8, "신규 탭 8건 이하");

  const closing = await getJobCuration(userId, "closing_soon");
  for (const item of closing.items) {
    assert(item.job.applyDeadline, `마감임박 탭은 마감일 있는 공고만 (${item.job.title})`);
  }

  const matched = await getJobCuration(userId, "matched");
  assert(["READY", "EMPTY", "NEEDS_PROFILE"].includes(matched.state), `맞춤 탭 상태 (got ${matched.state})`);
  if (matched.state === "READY") {
    const scores = matched.items.map((i) => i.matchScore ?? 0);
    assert(
      scores.every((s, i) => i === 0 || s <= scores[i - 1]),
      "맞춤 탭 점수 내림차순",
    );
  }

  const ready = await getJobCuration(userId, "ready_to_apply");
  assert(["READY", "EMPTY", "NEEDS_PROFILE"].includes(ready.state), `지원가능 탭 상태 (got ${ready.state})`);

  const unlockable = await getJobCuration(userId, "unlockable");
  assert(
    ["READY", "EMPTY", "NEEDS_ANALYSIS", "NEEDS_PROFILE"].includes(unlockable.state),
    `자격 탭 상태 (got ${unlockable.state})`,
  );
  if (unlockable.state === "READY") {
    assert(unlockable.items.every((i) => i.unlockRequirementName), "자격 탭 항목에 자격명 존재");
  }

  console.log("\n모든 검증 통과");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: 실행해 실패 확인**

Run: `DATA_SOURCE_MODE=mock npx tsx scripts/check-job-curation.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 타입 추가 + buildHypotheticalProfile export**

`src/types/job.ts` 끝에 위 Produces의 4개 타입을 추가한다 (JSDoc 포함, `Job` 타입은 같은 파일에 이미 있음).

`src/services/career-gap-engine.service.ts`의 `function buildHypotheticalProfile(...)`을 `export function buildHypotheticalProfile(...)`으로 변경 (주석에 "job-curation 자격 탭에서 재사용" 한 줄 추가).

- [ ] **Step 4: 서비스 구현**

`src/services/job-curation.service.ts`:

```typescript
import { findCareerProfileByUserId, getJobRepository } from "@/lib/repositories";
import type { CareerProfile, Job, JobCurationItem, JobCurationResult, JobCurationTab, JobSearchFilter } from "@/types";
import { evaluateJobFit } from "./job-match.service";
import { compareUserToJobRequirements } from "./job-requirement-comparison.service";
import { buildHypotheticalProfile, getCareerGapResult, listCareerGapSummariesForUser } from "./career-gap-engine.service";

const TAB_LIMIT = 8;
const CANDIDATE_LIMIT = 500;
const READY_CHECK_LIMIT = 50;
const NEW_WITHIN_DAYS = 3;
const CLOSING_WITHIN_DAYS = 7;
const COMMON_CACHE_TTL_MS = 10 * 60 * 1000;

/** 신규/마감임박은 전 유저 공통이므로 서버 메모리 캐시(TTL 10분)로 반복 계산을 막는다. */
const commonTabCache = new Map<string, { at: number; items: JobCurationItem[] }>();

/**
 * 채용공고 큐레이션 서비스 (설계: docs/superpowers/specs/2026-08-27-job-curation-section-design.md).
 * 모든 판정은 기존 엔진(evaluateJobFit / 요건 비교 / counterfactual)의 결정론적 산출값이다.
 * 개인화 탭은 절대 전체 jobs를 스캔하지 않는다 - getCandidateJobsForUser로 후보군 500건 제한.
 */
export async function getJobCuration(userId: string, tab: JobCurationTab): Promise<JobCurationResult> {
  try {
    switch (tab) {
      case "new":
        return { tab, ...(await getCommonTab("new")) };
      case "closing_soon":
        return { tab, ...(await getCommonTab("closing_soon")) };
      case "matched":
        return { tab, ...(await getMatchedTab(userId)) };
      case "ready_to_apply":
        return { tab, ...(await getReadyToApplyTab(userId)) };
      case "unlockable":
        return { tab, ...(await getUnlockableTab(userId)) };
    }
  } catch (error) {
    console.error(`[job-curation] ${tab} 탭 계산 실패`, error);
    return { tab, state: "EMPTY", items: [] };
  }
}

/**
 * 개인화 탭 공용 후보군: 희망 직종코드별 최신 공고 + 희망 지역 최신 공고를 합쳐
 * 최신순 상한 limit건. 6만+건 전체 스캔을 막는 성능 경계다.
 */
export async function getCandidateJobsForUser(userId: string, limit = CANDIDATE_LIMIT): Promise<Job[]> {
  const profile = await findCareerProfileByUserId(userId);
  if (!profile) return [];

  const repo = getJobRepository();
  const filters: JobSearchFilter[] = [];
  for (const category of profile.desiredJobCategories ?? []) {
    filters.push({ jobCategory: category, activeOnly: true, page: 1, pageSize: 250 } as JobSearchFilter);
  }
  if (profile.region) {
    filters.push({ region: profile.region, activeOnly: true, page: 1, pageSize: 250 } as JobSearchFilter);
  }
  if (filters.length === 0) return [];

  const results = await Promise.all(filters.map((f) => repo.search(f)));
  const byId = new Map<string, Job>();
  for (const r of results) for (const job of r.items) byId.set(job.id, job);

  return [...byId.values()]
    .sort((a, b) => ((a.postedAt ?? a.createdAt) < (b.postedAt ?? b.createdAt) ? 1 : -1))
    .slice(0, limit);
}

async function getCommonTab(kind: "new" | "closing_soon"): Promise<{ state: "READY" | "EMPTY"; items: JobCurationItem[] }> {
  const cached = commonTabCache.get(kind);
  if (cached && Date.now() - cached.at < COMMON_CACHE_TTL_MS) {
    return { state: cached.items.length > 0 ? "READY" : "EMPTY", items: cached.items };
  }

  const repo = getJobRepository();
  const result = await repo.search({ activeOnly: true, page: 1, pageSize: 200, sort: "latest" } as JobSearchFilter);
  const now = Date.now();

  let jobs: Job[];
  if (kind === "new") {
    const cutoff = now - NEW_WITHIN_DAYS * 24 * 60 * 60 * 1000;
    jobs = result.items
      .filter((j) => j.postedAt && new Date(j.postedAt).getTime() >= cutoff)
      .sort((a, b) => ((a.postedAt ?? "") < (b.postedAt ?? "") ? 1 : -1));
  } else {
    const max = now + CLOSING_WITHIN_DAYS * 24 * 60 * 60 * 1000;
    jobs = result.items
      .filter((j) => {
        if (!j.applyDeadline) return false;
        const t = new Date(j.applyDeadline).getTime();
        return t >= now && t <= max;
      })
      .sort((a, b) => ((a.applyDeadline ?? "") > (b.applyDeadline ?? "") ? 1 : -1));
  }

  const items = jobs.slice(0, TAB_LIMIT).map((job) => ({ job }));
  commonTabCache.set(kind, { at: now, items });
  return { state: items.length > 0 ? "READY" : "EMPTY", items };
}

async function getMatchedTab(userId: string) {
  const profile = await findCareerProfileByUserId(userId);
  if (!profile || ((profile.desiredJobCategories ?? []).length === 0 && !profile.region)) {
    return { state: "NEEDS_PROFILE" as const, items: [] };
  }
  const items = scoreCandidates(profile, await getCandidateJobsForUser(userId)).slice(0, TAB_LIMIT);
  return { state: items.length > 0 ? ("READY" as const) : ("EMPTY" as const), items };
}

async function getReadyToApplyTab(userId: string) {
  const profile = await findCareerProfileByUserId(userId);
  if (!profile) return { state: "NEEDS_PROFILE" as const, items: [] };

  const top = scoreCandidates(profile, await getCandidateJobsForUser(userId)).slice(0, READY_CHECK_LIMIT);
  const items: JobCurationItem[] = [];
  for (const item of top) {
    const comparison = await compareUserToJobRequirements(userId, item.job);
    const blocked = comparison.some((c) => c.jobLevel === "REQUIRED" && c.userStatus === "NOT_SATISFIED");
    if (!blocked) items.push(item);
    if (items.length >= TAB_LIMIT) break;
  }
  return { state: items.length > 0 ? ("READY" as const) : ("EMPTY" as const), items };
}

async function getUnlockableTab(userId: string) {
  const profile = await findCareerProfileByUserId(userId);
  if (!profile) return { state: "NEEDS_PROFILE" as const, items: [] };

  const summaries = await listCareerGapSummariesForUser(userId, 1);
  const latest = summaries[0];
  if (!latest) return { state: "NEEDS_ANALYSIS" as const, items: [] };
  const result = await getCareerGapResult(latest.id);
  const target = result?.topPriorityItem;
  if (!result || !target) return { state: "NEEDS_ANALYSIS" as const, items: [] };

  const requirement = {
    // buildHypotheticalProfile이 참조하는 필드만 채우면 된다 (matchingType/name)
    ...target,
    name: target.requirementName,
    matchingType: target.requirementCategory === "QUALIFICATION" ? ("QUALIFICATION" as const) : ("KEYWORD" as const),
  };
  // 주의: buildHypotheticalProfile의 실제 파라미터 타입은 CareerGapRequirement다.
  // 구현 시 career-gap-engine.service를 열어 실제 필드로 맞출 것 - 필요한 건 matchingType과 name뿐이다.
  const hypothetical = buildHypotheticalProfile(profile, requirement as never);

  const candidates = await getCandidateJobsForUser(userId);
  const items: JobCurationItem[] = [];
  for (const job of candidates) {
    const before = evaluateJobFit(profile, job);
    const after = evaluateJobFit(hypothetical, job);
    if (!after) continue;
    const beforeGrade = before?.grade ?? "D";
    if ((after.grade === "A" || after.grade === "B") && beforeGrade !== "A" && beforeGrade !== "B") {
      items.push({ job, matchScore: after.score, matchGrade: after.grade, unlockRequirementName: target.requirementName });
      if (items.length >= TAB_LIMIT) break;
    }
  }
  return { state: items.length > 0 ? ("READY" as const) : ("EMPTY" as const), items };
}

function scoreCandidates(profile: CareerProfile, jobs: Job[]): JobCurationItem[] {
  return jobs
    .map((job) => ({ job, match: evaluateJobFit(profile, job) }))
    .filter((x): x is { job: Job; match: NonNullable<ReturnType<typeof evaluateJobFit>> } => Boolean(x.match && x.match.score > 0))
    .sort((a, b) => b.match.score - a.match.score)
    .map(({ job, match }) => ({ job, matchScore: match.score, matchGrade: match.grade }));
}
```

주의사항 (구현 시 실제 코드에 맞출 것):
- `JobSearchFilter`의 실제 필드명(sort 값 "latest" 존재 여부, region 타입)은 `src/types/job.ts`를 열어 확인하고 맞춘다. `as JobSearchFilter` 캐스팅은 실제 필드가 맞으면 제거한다.
- `buildHypotheticalProfile`의 파라미터는 `CareerGapRequirement`다. `as never` 자리는 실제 타입에 맞는 최소 객체를 만들어 대체한다 (참조 필드는 `matchingType`, `name`뿐 — 함수 본문 확인).
- `CareerGapItemView`에 `requirementCategory`가 있다 (career-gap.ts 90행대).

- [ ] **Step 5: 스크립트 통과 확인**

Run: `DATA_SOURCE_MODE=mock npx tsx scripts/check-job-curation.ts`
Expected: `모든 검증 통과`. `npx tsc --noEmit`도 통과.

- [ ] **Step 6: 커밋**

```bash
git add src/types/job.ts src/services/job-curation.service.ts src/services/career-gap-engine.service.ts scripts/check-job-curation.ts
git commit -m "채용공고 큐레이션 서비스 추가 - 5개 탭 결정론 산출 + 후보군 500건 제한"
```

---

### Task 2: 서버 액션 + 트래킹

**Files:**
- Modify: `src/features/jobs/job-actions.ts`

**Interfaces:**
- Consumes: `getJobCuration(userId, tab)` (Task 1), 기존 `requireSessionUser` (파일 상단 import 확인), `logActivityEvent` (`@/lib/activity/event-logger`)
- Produces: `getJobCurationAction(tab: JobCurationTab): Promise<JobCurationResult>`, `trackCurationTabViewedAction(input: { tab: JobCurationTab }): Promise<void>`, `trackCurationJobClickedAction(input: { tab: JobCurationTab; jobId: string }): Promise<void>` — Task 3이 사용

- [ ] **Step 1: 액션 3개 추가**

`job-actions.ts` 끝에 (기존 파일의 "use server"/import 패턴 유지):

```typescript
export async function getJobCurationAction(tab: JobCurationTab): Promise<JobCurationResult> {
  const user = await requireSessionUser();
  return getJobCuration(user.id, tab);
}

export async function trackCurationTabViewedAction(input: { tab: JobCurationTab }): Promise<void> {
  const user = await requireSessionUser();
  await logActivityEvent({
    userId: user.id,
    eventType: "curation_tab_viewed",
    entityType: "job",
    metadata: { tab: input.tab },
  });
}

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
```

주의: `logActivityEvent`의 `eventType` 타입이 유니온으로 제한돼 있으면(`src/types/activity-event.ts` 확인) `"curation_tab_viewed" | "curation_job_clicked"`를 그 유니온에 추가한다.

- [ ] **Step 2: 타입체크 후 커밋**

Run: `npx tsc --noEmit`
```bash
git add src/features/jobs/job-actions.ts src/types/activity-event.ts
git commit -m "큐레이션 서버 액션 + 탭/카드 트래킹 이벤트 추가"
```

---

### Task 3: 큐레이션 섹션 UI 컴포넌트

**Files:**
- Create: `src/features/jobs/job-curation-section.tsx`

**Interfaces:**
- Consumes: Task 2의 액션 3개, `JobCard` (`./job-card`, props: job/matchScore/isAuthenticated/isBookmarked/heldQualifications), `JobCurationResult`/`JobCurationTab` 타입
- Produces: `<JobCurationSection initialNew={JobCurationResult} heldQualifications={string[]} bookmarkedIds={string[]} />` — Task 4가 사용

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { JobCurationResult, JobCurationTab } from "@/types";
import { JobCard } from "./job-card";
import {
  getJobCurationAction,
  trackCurationJobClickedAction,
  trackCurationTabViewedAction,
} from "./job-actions";

const TABS: { key: JobCurationTab; label: string }[] = [
  { key: "new", label: "신규 공고" },
  { key: "closing_soon", label: "마감임박" },
  { key: "matched", label: "맞춤 추천" },
  { key: "ready_to_apply", label: "지금 지원가능" },
  { key: "unlockable", label: "자격 따면 열리는 공고" },
];

const EMPTY_MESSAGES: Record<string, string> = {
  EMPTY: "조건에 맞는 공고가 아직 없어요.",
  NEEDS_PROFILE: "희망직무를 설정하면 맞춤 공고를 보여드려요.",
  NEEDS_ANALYSIS: "이력서 AI 점검 또는 커리어 진단을 먼저 해보세요.",
};

interface JobCurationSectionProps {
  initialNew: JobCurationResult;
  heldQualifications: string[];
  bookmarkedIds: string[];
}

export function JobCurationSection({ initialNew, heldQualifications, bookmarkedIds }: JobCurationSectionProps) {
  const [activeTab, setActiveTab] = useState<JobCurationTab>("new");
  const [results, setResults] = useState<Partial<Record<JobCurationTab, JobCurationResult>>>({ new: initialNew });
  const [loadingTab, setLoadingTab] = useState<JobCurationTab | null>(null);
  const trackedTabs = useRef(new Set<JobCurationTab>(["new"]));

  useEffect(() => {
    void trackCurationTabViewedAction({ tab: "new" });
  }, []);

  function handleTab(tab: JobCurationTab) {
    setActiveTab(tab);
    if (!trackedTabs.current.has(tab)) {
      trackedTabs.current.add(tab);
      void trackCurationTabViewedAction({ tab });
    }
    if (!results[tab] && loadingTab !== tab) {
      setLoadingTab(tab);
      getJobCurationAction(tab)
        .then((r) => setResults((prev) => ({ ...prev, [tab]: r })))
        .catch(() => setResults((prev) => ({ ...prev, [tab]: { tab, state: "EMPTY", items: [] } })))
        .finally(() => setLoadingTab(null));
    }
  }

  const current = results[activeTab];

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-body-1 font-bold text-slate-900">큐레이션 JOB</h2>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => handleTab(t.key)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-label-1 font-semibold transition-colors ${
              activeTab === t.key
                ? "border-brand-blue-500 bg-brand-blue-50 text-brand-blue-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loadingTab === activeTab && !current && (
        <p className="py-8 text-center text-label-1 text-slate-400">불러오는 중...</p>
      )}

      {current && current.items.length === 0 && (
        <p className="rounded-xl bg-slate-50 py-8 text-center text-label-1 text-slate-500">
          {EMPTY_MESSAGES[current.state] ?? EMPTY_MESSAGES.EMPTY}
        </p>
      )}

      {current && current.items.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {current.items.map((item) => (
            <div
              key={item.job.id}
              className="w-72 shrink-0"
              onClickCapture={() => void trackCurationJobClickedAction({ tab: activeTab, jobId: item.job.id })}
            >
              {item.unlockRequirementName && (
                <p className="mb-1 text-caption-1 font-semibold text-brand-blue-600">
                  {item.unlockRequirementName} 취득 시 지원 가능
                </p>
              )}
              <JobCard
                job={item.job}
                matchScore={item.matchScore}
                isAuthenticated
                isBookmarked={bookmarkedIds.includes(item.job.id)}
                heldQualifications={heldQualifications}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

주의: JobCard가 이미 D-day를 표시하는지 `job-card.tsx`를 열어 확인 — 표시한다면 별도 배지 불필요, 없다면 마감임박 탭 카드 위에 `item.job.applyDeadline` 기반 `D-{n}` 캡션을 unlockRequirementName과 같은 방식으로 추가한다.

- [ ] **Step 2: 타입체크·린트 후 커밋**

Run: `npx tsc --noEmit && npx eslint src/features/jobs/job-curation-section.tsx`
```bash
git add src/features/jobs/job-curation-section.tsx
git commit -m "큐레이션 JOB 섹션 컴포넌트 - 탭 지연 로드 + 트래킹"
```

---

### Task 4: /jobs 페이지 통합

**Files:**
- Modify: `src/app/(site)/jobs/page.tsx`

**Interfaces:**
- Consumes: `getJobCuration(userId, "new")` (Task 1 — 서버 컴포넌트에서 직접 호출), `<JobCurationSection>` (Task 3)

- [ ] **Step 1: 페이지 상단에 섹션 렌더**

`page.tsx`에서 (requireUser 이후 유저를 얻는 기존 코드 확인 — `getCurrentUser()` 사용 중):

1. import 추가: `getJobCuration` (`@/services/job-curation.service`), `JobCurationSection` (`@/features/jobs/job-curation-section`).
2. 기존 데이터 로드 Promise.all에 `getJobCuration(user.id, "new")`를 추가 (user는 requireUser/getCurrentUser 결과 — 실제 변수명 확인).
3. 검색 리스트 렌더 블록 바로 위에:
```tsx
<JobCurationSection initialNew={initialCuration} heldQualifications={heldQualifications} bookmarkedIds={bookmarkedIds} />
```
`heldQualifications`와 `bookmarkedIds`는 페이지가 이미 로드하고 있다(getUserQualificationRepository / getUserJobBookmarkIdsAction — 실제 변수명을 열어서 맞출 것). 필터 검색 결과 영역·페이지네이션은 변경하지 않는다.

- [ ] **Step 2: 브라우저 검증**

preview_start로 dev 서버 기동 → 로그인 → `/jobs`에서 5개 탭 전환, 카드 렌더, 빈 상태 문구, 콘솔 에러 없음(read_console_messages) 확인. 스크린샷 1장.

- [ ] **Step 3: 커밋**

```bash
git add "src/app/(site)/jobs/page.tsx"
git commit -m "채용공고 페이지 상단에 큐레이션 JOB 섹션 연결"
```

---

### Task 5: 홈 추천 전체 스캔 제거 (성능 리팩터)

**Files:**
- Modify: `src/services/job-search.service.ts` (`getRecommendedJobsForUser`)

**Interfaces:**
- Consumes: `getCandidateJobsForUser(userId, limit)` (Task 1)

- [ ] **Step 1: 후보군 헬퍼로 교체**

`getRecommendedJobsForUser`의 `getJobRepository().findAll({ activeOnly: true })` 전체 스캔(6만+건)을 `getCandidateJobsForUser(userId)` 호출로 교체한다. 이후 scoring/정렬/slice 로직은 유지. 순환 import가 생기면(job-search ↔ job-curation) `getCandidateJobsForUser`를 `job-curation.service`에서 그대로 두고 job-search가 import하는 방향만 확인 (curation은 job-search를 import하지 않으므로 순환 없음).

- [ ] **Step 2: 타입체크 후 커밋**

Run: `npx tsc --noEmit`
```bash
git add src/services/job-search.service.ts
git commit -m "홈 추천 공고 전체 스캔 제거 - 큐레이션 후보군 헬퍼 재사용"
```

---

### Task 6: 전체 검증

- [ ] **Step 1**: `DATA_SOURCE_MODE=mock npx tsx scripts/check-job-curation.ts` → 통과
- [ ] **Step 2**: `DATA_SOURCE_MODE=mock npx tsx scripts/check-resume-market-comparison.ts` → 회귀 없음
- [ ] **Step 3**: `npm run lint && npm run build` → 통과
- [ ] **Step 4**: 수정사항 있으면 마무리 커밋
