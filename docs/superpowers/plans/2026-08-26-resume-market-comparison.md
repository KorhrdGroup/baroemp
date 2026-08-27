# 첨삭 결과 → 시장 비교 카드 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 이력서/자소서 첨삭 결과 화면에 기존 커리어갭 엔진의 결정론적 산출값(요구/우대 공고 %, 자격 취득 시 매칭 공고 수 변화, 준비방법 콘텐츠)으로 시장 비교 카드를 렌더하고, 카드 상호작용을 activity event → lead-score로 흘린다.

**Architecture:** 신규 서비스 `resume-market-comparison.service.ts`가 타겟 occupation을 3단계 fallback으로 결정한 뒤 기존 `runCareerGapAnalysis`를 호출해 카드용 뷰모델(`ResumeMarketComparisonView`)로 축약한다. AI 첨삭 액션과 완전히 분리된 별도 Server Action으로 노출하고, 공용 클라이언트 카드 컴포넌트가 resume/cover-letter 두 에디터에서 재사용된다.

**Tech Stack:** Next.js Server Actions, 기존 repository 레이어(mock/supabase 이중 모드), tsx 검증 스크립트(이 repo는 vitest/jest 없음 — `scripts/check-*.ts` 패턴 사용).

**설계 문서:** `docs/superpowers/specs/2026-08-26-resume-market-comparison-design.md`

## Global Constraints

- 카드의 모든 수치는 기존 엔진의 결정론적 산출값만 사용한다. AI 출력은 카드에 개입하지 않는다 (스펙 49/50번).
- "취업률 N% 더 높습니다"류 문구는 금지 (산출 불가능 + 표시광고 리스크). 공고 비율·매칭 건수 변화만 표기.
- mock/supabase 양쪽 모드에서 동작해야 한다 — DB 접근은 반드시 `@/lib/repositories` getter를 통한다.
- AI 첨삭 실패 시에도 카드는 떠야 하고, 엔진 실패 시에도 첨삭 결과는 정상 노출되어야 한다 (상호 독립).
- UI 문구는 한국어. 기존 컴포넌트(`Card`, `Badge`, brand-blue 팔레트)와 스타일 일치.
- 커밋 메시지는 이 repo 관례대로 한국어 요약 한 줄.

---

### Task 1: 뷰모델 타입 + resume-market-comparison 서비스 + 검증 스크립트

**Files:**
- Modify: `src/types/career-gap.ts` (파일 끝에 타입 추가)
- Create: `src/services/resume-market-comparison.service.ts`
- Test: `scripts/check-resume-market-comparison.ts` (mock 모드 tsx 검증 스크립트)

**Interfaces:**
- Consumes: `runCareerGapAnalysis(params: {userId, occupationId, employmentDestinationId?, targetJobId?}): Promise<CareerGapResultView>` (career-gap-engine.service), `mergeResumeToCareerProfile(resumeId: string): Promise<void>` (resume-career-merge.service), `resolveOccupationForJobCategory(jobCategoryCode?: string): Promise<Occupation | null>` (`@/lib/jobs/job-occupation-resolver`)
- Produces: `ResumeMarketComparisonView` 타입, `getMarketComparisonForTarget(params)`, `getResumeMarketComparison(resumeId)`, `getCoverLetterMarketComparison(coverLetterId)` — Task 2가 이 세 함수를 import한다.

- [ ] **Step 1: 검증 스크립트 먼저 작성 (실패 확인용)**

`scripts/check-resume-market-comparison.ts` 생성:

```typescript
/**
 * resume-market-comparison.service 검증 스크립트 (mock 모드).
 * 타겟 결정 3단계 fallback과 카드 뷰모델 산출을 검증한다.
 *
 * 실행: DATA_SOURCE_MODE=mock npx tsx scripts/check-resume-market-comparison.ts
 */
import { getOccupationRepository, getProfileRepository } from "@/lib/repositories";
import { getMarketComparisonForTarget } from "@/services/resume-market-comparison.service";

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

  const profiles = await getProfileRepository().findAll();
  assert(profiles.length > 0, "mock 프로필 존재");
  const userId = profiles[0].id;

  const occupations = await getOccupationRepository().findAll();
  const occupation = occupations.find((o) => o.status === "published") ?? occupations[0];
  assert(occupation, "mock occupation 존재");

  // 1. 타겟 정보가 전혀 없으면 NEEDS_TARGET
  const none = await getMarketComparisonForTarget({ userId });
  assert(none.state === "NEEDS_TARGET", `타겟 없음 → NEEDS_TARGET (got ${none.state})`);
  assert(none.items.length === 0, "NEEDS_TARGET이면 items 비어있음");

  // 2. targetOccupationId 직접 지정 → READY
  const direct = await getMarketComparisonForTarget({ userId, targetOccupationId: occupation.id });
  assert(direct.state === "READY", `occupationId 지정 → READY (got ${direct.state})`);
  assert(direct.analysisId, "READY이면 analysisId 존재");
  assert(direct.items.length <= 3, `카드 항목 3개 이하 (got ${direct.items.length})`);
  for (const item of direct.items) {
    assert(item.marketRate >= 0 && item.marketRate <= 100, `marketRate 0~100 (${item.requirementName}: ${item.marketRate})`);
    assert(typeof item.showRate === "boolean", `showRate는 confidence 기반 boolean (${item.requirementName})`);
    assert(
      item.projectedEligibleJobCount === undefined || item.projectedEligibleJobCount >= item.currentEligibleJobCount,
      `시뮬레이션 결과는 현재 매칭 수 이상 (${item.requirementName})`,
    );
  }

  // 3. desiredJobTitle 이름 매칭 fallback → READY
  const byTitle = await getMarketComparisonForTarget({ userId, desiredJobTitle: occupation.name });
  assert(byTitle.state === "READY", `desiredJobTitle 매칭 → READY (got ${byTitle.state})`);

  // 4. 매칭 불가능한 직무명 → NEEDS_TARGET
  const noMatch = await getMarketComparisonForTarget({ userId, desiredJobTitle: "존재하지않는직무XYZ" });
  assert(noMatch.state === "NEEDS_TARGET", `매칭 실패 → NEEDS_TARGET (got ${noMatch.state})`);

  console.log("\n모든 검증 통과");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: 스크립트 실행해 실패 확인**

Run: `DATA_SOURCE_MODE=mock npx tsx scripts/check-resume-market-comparison.ts`
Expected: FAIL — `Cannot find module '@/services/resume-market-comparison.service'` 류의 모듈 없음 에러.

- [ ] **Step 3: 타입 추가**

`src/types/career-gap.ts` 파일 끝에 추가:

```typescript
/** 첨삭 결과 화면 시장 비교 카드 상태. NEEDS_TARGET은 희망직무 미설정 CTA, UNAVAILABLE은 카드 미표시. */
export type ResumeMarketComparisonState = "READY" | "NEEDS_TARGET" | "UNAVAILABLE";

/** 시장 비교 카드의 requirement 1건 (전부 결정론 엔진 산출값 - 스펙 49번). */
export interface ResumeMarketComparisonItem {
  requirementId: string;
  requirementName: string;
  /** 요구+우대 공고 비율(%). market_required_rate + market_preferred_rate, 100 상한. */
  marketRate: number;
  /** 표본 부족(confidence LOW 또는 isDataSufficient=false) 시 false — %수치 대신 정성 문구 표시 */
  showRate: boolean;
  currentEligibleJobCount: number;
  /** Counterfactual: 이 조건 충족 가정 시 매칭 공고 수 (스펙 17번) */
  projectedEligibleJobCount?: number;
  recommendedContent?: { contentId: string; title: string };
}

/** 첨삭 결과 화면(이력서/자소서 공용) 시장 비교 카드 뷰모델. */
export interface ResumeMarketComparisonView {
  state: ResumeMarketComparisonState;
  analysisId?: string;
  occupationName?: string;
  marketSampleSize?: number;
  items: ResumeMarketComparisonItem[];
}
```

- [ ] **Step 4: 서비스 구현**

`src/services/resume-market-comparison.service.ts` 생성:

```typescript
import { resolveOccupationForJobCategory } from "@/lib/jobs/job-occupation-resolver";
import {
  getCoverLetterRepository,
  getJobRepository,
  getOccupationRepository,
  getResumeRepository,
} from "@/lib/repositories";
import type { CareerGapResultView, ResumeMarketComparisonView } from "@/types";
import { runCareerGapAnalysis } from "./career-gap-engine.service";
import { mergeResumeToCareerProfile } from "./resume-career-merge.service";

const MAX_CARD_ITEMS = 3;

/**
 * 첨삭 결과 화면 "시장 비교 카드" 서비스 (설계: docs/superpowers/specs/2026-08-26-resume-market-comparison-design.md).
 *
 * AI 첨삭과 완전히 독립적으로 동작한다 - 카드의 모든 수치는 기존 Career Gap Engine의
 * 결정론적 산출값(시장 통계 + Counterfactual Simulation)만 사용하고 AI는 개입하지 않는다 (스펙 49/50번).
 * 엔진 실패 시 UNAVAILABLE을 반환해 카드만 숨기고 첨삭 흐름에는 영향을 주지 않는다.
 */
export async function getMarketComparisonForTarget(params: {
  userId: string;
  targetOccupationId?: string;
  targetJobId?: string;
  desiredJobTitle?: string;
}): Promise<ResumeMarketComparisonView> {
  const occupationId = await resolveTargetOccupationId(params);
  if (!occupationId) return { state: "NEEDS_TARGET", items: [] };

  try {
    const result = await runCareerGapAnalysis({
      userId: params.userId,
      occupationId,
      targetJobId: params.targetJobId,
    });
    return toComparisonView(result);
  } catch (error) {
    console.error("[resume-market-comparison] 커리어갭 분석 실패", error);
    return { state: "UNAVAILABLE", items: [] };
  }
}

/** 이력서 첨삭용: merge(best-effort) 후 이력서의 타겟 정보로 카드 산출. */
export async function getResumeMarketComparison(resumeId: string): Promise<ResumeMarketComparisonView> {
  const resume = await getResumeRepository().findById(resumeId);
  if (!resume) return { state: "UNAVAILABLE", items: [] };

  try {
    await mergeResumeToCareerProfile(resumeId);
  } catch (error) {
    // merge는 best-effort - 실패해도 기존 프로필 기준으로 카드는 계속 산출한다 (설계 8절)
    console.error("[resume-market-comparison] 프로필 병합 실패", error);
  }

  return getMarketComparisonForTarget({
    userId: resume.userId,
    targetOccupationId: resume.targetOccupationId,
    targetJobId: resume.targetJobId,
    desiredJobTitle: resume.desiredJobTitle,
  });
}

/** 자소서 첨삭용: 자소서에 연결된 공고 기준. */
export async function getCoverLetterMarketComparison(coverLetterId: string): Promise<ResumeMarketComparisonView> {
  const coverLetter = await getCoverLetterRepository().findById(coverLetterId);
  if (!coverLetter) return { state: "UNAVAILABLE", items: [] };

  return getMarketComparisonForTarget({
    userId: coverLetter.userId,
    targetJobId: coverLetter.targetJobId,
  });
}

/**
 * 타겟 occupation 3단계 fallback (설계 4절):
 * ① targetOccupationId 직접 → ② targetJobId 공고의 jobCategory → ③ desiredJobTitle 이름 매칭.
 */
async function resolveTargetOccupationId(params: {
  targetOccupationId?: string;
  targetJobId?: string;
  desiredJobTitle?: string;
}): Promise<string | undefined> {
  if (params.targetOccupationId) return params.targetOccupationId;

  if (params.targetJobId) {
    const job = await getJobRepository().findById(params.targetJobId);
    const occupation = await resolveOccupationForJobCategory(job?.jobCategory);
    if (occupation) return occupation.id;
  }

  const title = params.desiredJobTitle?.trim();
  if (title) {
    const occupations = await getOccupationRepository().findAll();
    const matched = occupations.find((o) => o.name.includes(title) || title.includes(o.name));
    if (matched) return matched.id;
  }

  return undefined;
}

function toComparisonView(result: CareerGapResultView): ResumeMarketComparisonView {
  const showRate = result.isDataSufficient && result.confidence !== "LOW";

  const items = result.improvementItems
    .filter((item) => item.userStatus === "NOT_SATISFIED")
    .slice(0, MAX_CARD_ITEMS)
    .map((item) => {
      const recommendation = result.recommendations.find(
        (r) => r.requirementId === item.requirementId && r.contentId,
      );
      return {
        requirementId: item.requirementId,
        requirementName: item.requirementName,
        marketRate: Math.min(100, Math.round(item.marketRequiredRate + item.marketPreferredRate)),
        showRate,
        currentEligibleJobCount: result.currentEligibleJobCount,
        projectedEligibleJobCount: item.projectedEligibleJobCount,
        recommendedContent: recommendation?.contentId
          ? { contentId: recommendation.contentId, title: recommendation.title }
          : undefined,
      };
    });

  return {
    state: "READY",
    analysisId: result.analysisId,
    occupationName: result.occupationName,
    marketSampleSize: result.marketSampleSize,
    items,
  };
}
```

- [ ] **Step 5: 스크립트 재실행해 통과 확인**

Run: `DATA_SOURCE_MODE=mock npx tsx scripts/check-resume-market-comparison.ts`
Expected: `모든 검증 통과` 출력, exit 0.

주의: 2번 검증(READY)이 실패하고 UNAVAILABLE이 나온다면 `runCareerGapAnalysis`가 mock 모드에서 던진 에러가 원인이다 — `console.error` 로그를 읽고 원인(예: mock career profile 부재)을 확인할 것. mock 프로필이 없는 유저라면 스크립트에서 `findCareerProfileByUserId`로 프로필이 있는 유저를 골라 쓰도록 수정한다.

- [ ] **Step 6: 커밋**

```bash
git add src/types/career-gap.ts src/services/resume-market-comparison.service.ts scripts/check-resume-market-comparison.ts
git commit -m "첨삭 결과 시장 비교 카드 서비스 추가 - 타겟 3단계 fallback + 커리어갭 엔진 재사용"
```

---

### Task 2: Server Actions (이력서/자소서) + 트래킹 source 확장

**Files:**
- Modify: `src/features/resume/resume-actions.ts`
- Modify: `src/features/cover-letter/cover-letter-actions.ts`
- Modify: `src/features/career-gap/career-gap-actions.ts` (`trackCareerGapItemViewedAction`, `trackCareerGapRecommendationClickedAction`에 `source` 추가)

**Interfaces:**
- Consumes: Task 1의 `getResumeMarketComparison(resumeId)`, `getCoverLetterMarketComparison(coverLetterId)`; 기존 `requireOwnResume(resumeId)` (resume-actions.ts 내부), `requireOwnCoverLetter(coverLetterId)` (cover-letter-actions.ts 내부)
- Produces: `getResumeMarketComparisonAction(resumeId: string): Promise<ResumeMarketComparisonView>`, `getCoverLetterMarketComparisonAction(coverLetterId: string): Promise<ResumeMarketComparisonView>`, 그리고 `trackCareerGapItemViewedAction`/`trackCareerGapRecommendationClickedAction`의 input에 `source?: "resume_review" | "cover_letter_review"` 필드 — Task 3 카드 컴포넌트가 사용.

- [ ] **Step 1: resume 액션 추가**

`src/features/resume/resume-actions.ts` — import에 `getResumeMarketComparison` (from `@/services/resume-market-comparison.service`)과 `ResumeMarketComparisonView` 타입 추가 후, `reviewResumeAiAction` 아래에:

```typescript
export async function getResumeMarketComparisonAction(resumeId: string): Promise<ResumeMarketComparisonView> {
  await requireOwnResume(resumeId);
  return getResumeMarketComparison(resumeId);
}
```

- [ ] **Step 2: cover-letter 액션 추가**

`src/features/cover-letter/cover-letter-actions.ts` — import 추가 후 `reviewCoverLetterSectionAiAction` 아래에:

```typescript
export async function getCoverLetterMarketComparisonAction(coverLetterId: string): Promise<ResumeMarketComparisonView> {
  await requireOwnCoverLetter(coverLetterId);
  return getCoverLetterMarketComparison(coverLetterId);
}
```

- [ ] **Step 3: 트래킹 액션에 source 추가**

`src/features/career-gap/career-gap-actions.ts`의 두 액션을 수정 (기존 호출부는 source 미전달이므로 하위호환):

```typescript
export async function trackCareerGapItemViewedAction(input: {
  analysisId: string;
  requirementId: string;
  marketRate: number;
  source?: "resume_review" | "cover_letter_review";
}): Promise<void> {
  const user = await requireSessionUser();
  await logActivityEvent({
    userId: user.id,
    eventType: "career_gap_item_viewed",
    entityType: "career_gap_analysis",
    entityId: input.analysisId,
    metadata: { requirementId: input.requirementId, marketRate: input.marketRate, source: input.source },
  });
}
```

`trackCareerGapRecommendationClickedAction`도 동일 패턴으로 `source?: "resume_review" | "cover_letter_review"`를 input에 추가하고 metadata에 `source: input.source`를 넣는다.

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (기존 에러가 있다면 이 변경으로 늘어난 게 없는지만 확인).

- [ ] **Step 5: 커밋**

```bash
git add src/features/resume/resume-actions.ts src/features/cover-letter/cover-letter-actions.ts src/features/career-gap/career-gap-actions.ts
git commit -m "시장 비교 카드 Server Action 추가 + 커리어갭 트래킹에 source 구분"
```

---

### Task 3: 시장 비교 카드 컴포넌트

**Files:**
- Create: `src/features/career-gap/market-comparison-card.tsx`

**Interfaces:**
- Consumes: `ResumeMarketComparisonView` 타입, `trackCareerGapItemViewedAction`/`trackCareerGapRecommendationClickedAction` (Task 2 확장판)
- Produces: `<MarketComparisonCard view={ResumeMarketComparisonView} source={"resume_review" | "cover_letter_review"} />` — Task 4/5가 사용.

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { BarChart3, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResumeMarketComparisonView } from "@/types";
import {
  trackCareerGapItemViewedAction,
  trackCareerGapRecommendationClickedAction,
} from "./career-gap-actions";

interface MarketComparisonCardProps {
  view: ResumeMarketComparisonView;
  source: "resume_review" | "cover_letter_review";
}

/**
 * 첨삭 결과 하단 "실제 채용시장 분석" 카드 (이력서/자소서 공용).
 * 모든 수치는 커리어갭 엔진의 결정론적 산출값이다 - AI 첨삭 결과와 무관 (스펙 49번).
 */
export function MarketComparisonCard({ view, source }: MarketComparisonCardProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    const top = view.items[0];
    if (view.state !== "READY" || !view.analysisId || !top) return;
    trackedRef.current = true;
    void trackCareerGapItemViewedAction({
      analysisId: view.analysisId,
      requirementId: top.requirementId,
      marketRate: top.marketRate,
      source,
    });
  }, [view, source]);

  if (view.state === "UNAVAILABLE") return null;

  if (view.state === "NEEDS_TARGET") {
    return (
      <Card className="rounded-xl border-0 ring-1 ring-slate-200 bg-slate-50">
        <CardContent className="flex items-center justify-between gap-3 py-4 text-label-1 text-slate-600">
          <p>희망직무를 설정하면 실제 채용시장과 비교해 무엇이 더 필요한지 알려드려요.</p>
          <Link
            href="/career-gap"
            className="flex shrink-0 items-center gap-1 font-semibold text-brand-blue-700 hover:underline"
          >
            직무 설정하기 <ChevronRight className="size-4" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (view.items.length === 0) return null;

  return (
    <Card className="rounded-xl border-0 ring-1 ring-brand-blue-200 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-body-2">
          <BarChart3 className="size-4 text-brand-blue-500" />
          실제 채용시장 분석 결과
          {view.occupationName && <Badge variant="outline">{view.occupationName}</Badge>}
        </CardTitle>
        {typeof view.marketSampleSize === "number" && view.marketSampleSize > 0 && (
          <p className="text-caption-1 text-slate-400">최근 공고 {view.marketSampleSize}건 기준</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-label-1">
        {view.items.map((item) => (
          <div key={item.requirementId} className="space-y-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <p className="font-semibold text-slate-800">{item.requirementName}</p>
            <p className="text-slate-600">
              {item.showRate
                ? `이 조건을 요구하거나 우대하는 공고 ${item.marketRate}%`
                : "이 직무에서 자주 요구되는 조건입니다"}
            </p>
            {typeof item.projectedEligibleJobCount === "number" && (
              <p className="text-slate-600">
                충족 시 회원님 조건과 일치하는 공고{" "}
                <span className="font-semibold text-brand-blue-700">
                  {item.currentEligibleJobCount}건 → {item.projectedEligibleJobCount}건
                </span>
              </p>
            )}
            <Link
              href="/consulting"
              onClick={() => {
                if (!view.analysisId) return;
                void trackCareerGapRecommendationClickedAction({
                  analysisId: view.analysisId,
                  requirementId: item.requirementId,
                  contentId: item.recommendedContent?.contentId,
                  source,
                });
              }}
              className="inline-flex items-center gap-1 pt-1 font-semibold text-brand-blue-700 hover:underline"
            >
              {item.recommendedContent ? `${item.recommendedContent.title} 준비방법 확인` : "준비방법 확인"}
              <ChevronRight className="size-4" />
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

주의: `Badge`에 `variant="outline"`이 없다면(shadcn 기본이면 있음) 해당 prop을 제거하고 클래스로 대체한다. import 경로(`@/components/ui/...`)는 resume-editor.tsx의 실제 import와 동일하게 맞춘다.

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/features/career-gap/market-comparison-card.tsx
git commit -m "시장 비교 카드 컴포넌트 추가 - 이력서/자소서 첨삭 공용"
```

---

### Task 4: 이력서 에디터 통합

**Files:**
- Modify: `src/features/resume/resume-editor.tsx` (reviewResult 상태 근처 + AI 점검 결과 Card 아래)

**Interfaces:**
- Consumes: `getResumeMarketComparisonAction(resumeId)` (Task 2), `<MarketComparisonCard>` (Task 3)

- [ ] **Step 1: 상태와 호출 추가**

`resume-editor.tsx`:

1. import 추가:
```tsx
import { MarketComparisonCard } from "@/features/career-gap/market-comparison-card";
import { getResumeMarketComparisonAction } from "./resume-actions";
import type { ResumeMarketComparisonView } from "@/types";
```
(기존 import 블록의 타입/액션 import에 합류시킨다.)

2. `const [reviewResult, setReviewResult] = useState<AIResumeReviewResult | null>(null);` (136행 부근) 아래에:
```tsx
const [marketComparison, setMarketComparison] = useState<ResumeMarketComparisonView | null>(null);
```

3. `handleReview()` (192행 부근) 안에서 `reviewResumeAiAction(resume.id)` 성공 후 `setReviewResult(result)` 다음에:
```tsx
// AI 첨삭과 독립 - 실패해도 첨삭 결과 표시에는 영향 없음 (설계 3절)
void getResumeMarketComparisonAction(resume.id)
  .then(setMarketComparison)
  .catch(() => setMarketComparison(null));
```

4. `{reviewResult && ( <Card ...AI 점검 결과... /> )}` 블록(295~336행 부근) 바로 아래에:
```tsx
{reviewResult && marketComparison && (
  <MarketComparisonCard view={marketComparison} source="resume_review" />
)}
```

- [ ] **Step 2: 브라우저 검증**

`preview_start`로 dev 서버 기동 → 로그인 → `/resume` 이력서 편집 → [AI 점검] 실행 → AI 점검 결과 카드 아래에 시장 비교 카드(또는 NEEDS_TARGET CTA)가 뜨는지 확인. 콘솔 에러 없는지 `read_console_messages`로 확인.

- [ ] **Step 3: 커밋**

```bash
git add src/features/resume/resume-editor.tsx
git commit -m "이력서 AI 점검 결과에 시장 비교 카드 연결"
```

---

### Task 5: 자소서 에디터 통합

**Files:**
- Modify: `src/features/cover-letter/cover-letter-editor.tsx`

**Interfaces:**
- Consumes: `getCoverLetterMarketComparisonAction(coverLetterId)` (Task 2), `<MarketComparisonCard>` (Task 3)

- [ ] **Step 1: 상태와 호출 추가**

`cover-letter-editor.tsx`:

1. import 추가 (Task 4와 동일 패턴, 액션만 `getCoverLetterMarketComparisonAction`을 `./cover-letter-actions`에서).

2. 컴포넌트 상단 상태에:
```tsx
const [marketComparison, setMarketComparison] = useState<ResumeMarketComparisonView | null>(null);
```

3. `handleReviewSection` (160행 부근) 안에서 섹션 첨삭 성공 처리 직후에 (최초 1회만 조회):
```tsx
if (!marketComparison) {
  void getCoverLetterMarketComparisonAction(coverLetter.id)
    .then(setMarketComparison)
    .catch(() => setMarketComparison(null));
}
```
주의: 컴포넌트가 받는 자소서 prop 이름이 `coverLetter`가 아닐 수 있다 — 파일 상단 props에서 자소서 id에 접근하는 실제 변수명을 확인해 사용한다.

4. 섹션 목록 렌더 블록 아래(첨삭 결과가 보이는 영역 하단)에:
```tsx
{marketComparison && <MarketComparisonCard view={marketComparison} source="cover_letter_review" />}
```

- [ ] **Step 2: 브라우저 검증**

자소서 편집 화면에서 섹션 [AI 첨삭] 실행 → 카드 표시 확인. 자소서에 연결 공고(targetJobId)가 없으면 NEEDS_TARGET CTA가 뜨는 것이 정상.

- [ ] **Step 3: 커밋**

```bash
git add src/features/cover-letter/cover-letter-editor.tsx
git commit -m "자소서 AI 첨삭 결과에 시장 비교 카드 연결"
```

---

### Task 6: 전체 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 검증 스크립트 재실행**

Run: `DATA_SOURCE_MODE=mock npx tsx scripts/check-resume-market-comparison.ts`
Expected: `모든 검증 통과`

- [ ] **Step 2: lint + build**

Run: `npm run lint && npm run build`
Expected: 에러 없음.

- [ ] **Step 3: 수정사항 있으면 마무리 커밋**

빌드/린트에서 수정이 나왔다면:
```bash
git add -A src scripts
git commit -m "시장 비교 카드 lint/build 정리"
```
