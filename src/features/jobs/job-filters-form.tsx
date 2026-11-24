"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterPillClass, filterPillOffClass } from "@/lib/ui-classes";
import { REGION_LABELS } from "@/lib/labels";
import { SIGUNGU_BY_REGION } from "@/lib/regions/sigungu-list";
import type { Region } from "@/types";
import { JOB_CATEGORY_GROUPS, jobCategoryLabel as labelOfJobCategory } from "@/lib/jobs/job-category-groups";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import { trackJobFilterChangedAction, trackJobSearchAction } from "@/features/jobs/job-actions";
import type { JobSortOrder } from "@/types";

/** 한 번에 고를 수 있는 시·군·구 수. */
const MAX_SIGUNGU = 5;

const SORT_OPTIONS: { value: JobSortOrder; label: string }[] = [
  { value: "recommended", label: "추천순" },
  { value: "latest", label: "최신순" },
  { value: "deadline", label: "마감임박순" },
  { value: "salary_desc", label: "급여높은순" },
];

export interface JobFiltersValue {
  keyword?: string;
  /** 고른 직종. 여러 개를 고를 수 있고, 직업진단에서 넘어온 6자리 코드도 여기 실린다. */
  jobCategories?: string[];
  region?: string;
  /** 시·군·구 이름. 시·도를 고른 뒤에만 쓰고, 같은 시·도 안에서 여러 개 고를 수 있다. */
  regionSigungus?: string[];
  isBeginnerFriendly?: boolean;
  closingSoon?: boolean;
  sort?: JobSortOrder;
}

/**
 * 일자리찾기의 검색 틀 (왼쪽 조건 + 오른쪽 목록).
 *
 * 넓은 화면은 지역·직종·조건을 왼쪽에 늘 펼쳐 둔다. 드롭다운 안에 숨겨 두면
 * 무엇으로 좁힐 수 있는지부터 찾아야 한다. 조건을 고른 뒤 "적용하기"로 한 번에 부른다 -
 * 칸 하나 누를 때마다 목록을 다시 부르면 구 다섯 개를 고르는 동안 화면이 다섯 번 바뀐다.
 * 좁은 화면은 같은 조건 판을 "조건 선택" 버튼으로 아래에서 올린다.
 * 제출 시 서버 컴포넌트(/jobs)가 다시 렌더링되도록 쿼리스트링 기반 네비게이션을 사용한다.
 */
export function JobFiltersForm({
  initial,
  children,
  curation,
  summary,
  jobCategoryLabel,
  profileRegion,
}: {
  initial: JobFiltersValue;
  /** 공고 목록. 오른쪽 칸의 건수·정렬 줄 아래에 들어간다. */
  children?: React.ReactNode;
  /** 오른쪽 칸 맨 위에 둘 큐레이션 띠. */
  curation?: React.ReactNode;
  /** 결과 건수처럼 정렬 줄 왼쪽에 함께 놓을 요약 문구. */
  summary?: React.ReactNode;
  /**
   * 직종 선택기 목록에 없는 코드로 들어온 경우의 이름.
   * 직업진단 결과에서 넘어오는 코드는 이 목록에 없어서, 없으면 필터가 걸렸는데도
   * 무엇으로 좁혀졌는지 알 수 없었다.
   */
  jobCategoryLabel?: string;
  /**
   * 취업 프로필의 희망지역. 서버(/jobs)가 지역을 안 고른 회원에게 이 값을 기본 필터로 건다.
   * 그래서 회원이 "지역 전체"를 고를 때는 region 을 비우는 대신 region=all 을 실어야
   * 서버가 기본값을 다시 걸지 않는다.
   */
  profileRegion?: string;
}) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [keyword, setKeyword] = useState(initial.keyword ?? "");
  const [region, setRegion] = useState(initial.region ?? "all");
  const [sigungus, setSigungus] = useState<string[]>(initial.regionSigungus ?? []);
  const [jobCategories, setJobCategories] = useState<string[]>(initial.jobCategories ?? []);
  const [beginnerOnly, setBeginnerOnly] = useState(Boolean(initial.isBeginnerFriendly));
  const [closingSoon, setClosingSoon] = useState(Boolean(initial.closingSoon));
  const [sort, setSort] = useState<JobSortOrder>(initial.sort ?? "recommended");

  const regionActive = region !== "all";
  const jobActive = jobCategories.length > 0;
  /* 직업진단에서 넘어온 코드처럼 묶음 목록에 없는 직종. 목록 맨 위에 체크된 채로 보여 준다. */
  const extraCategories = jobCategories.filter((key) => !JOB_CATEGORY_GROUPS.some((g) => g.key === key));
  /* 좁은 화면의 "조건 선택" 버튼에 몇 가지가 걸려 있는지 센다. */
  const appliedCount =
    (initial.region ? 1 : 0) +
    (initial.jobCategories?.length ?? 0) +
    (initial.isBeginnerFriendly ? 1 : 0) +
    (initial.closingSoon ? 1 : 0);

  const toggleJobCategory = (key: string) =>
    setJobCategories((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const buildParams = (overrides: Partial<JobFiltersValue> = {}) => {
    const next: JobFiltersValue = {
      keyword,
      region: region === "all" ? undefined : region,
      regionSigungus: region === "all" || sigungus.length === 0 ? undefined : sigungus,
      jobCategories: jobCategories.length > 0 ? jobCategories : undefined,
      isBeginnerFriendly: beginnerOnly || undefined,
      closingSoon: closingSoon || undefined,
      sort,
      ...overrides,
    };
    const params = new URLSearchParams();
    if (next.keyword) params.set("keyword", next.keyword);
    if (next.region) params.set("region", next.region);
    else if (profileRegion) params.set("region", "all");
    if (next.regionSigungus?.length) params.set("sgg", next.regionSigungus.join(","));
    if (next.jobCategories?.length) params.set("category", next.jobCategories.join(","));
    if (next.isBeginnerFriendly) params.set("beginner", "1");
    if (next.closingSoon) params.set("closingSoon", "1");
    if (next.sort && next.sort !== "recommended") params.set("sort", next.sort);
    return { next, params };
  };

  const submit = async (overrides: Partial<JobFiltersValue> = {}) => {
    setSheetOpen(false);
    setSortOpen(false);
    const { next, params } = buildParams(overrides);
    const anonymousId = getOrCreateAnonymousId();
    if (Object.keys(overrides).length > 0) {
      await trackJobFilterChangedAction({ anonymousId, filter: next as Record<string, unknown> });
    } else {
      await trackJobSearchAction({ anonymousId, keyword: next.keyword, filter: next as Record<string, unknown>, resultCount: -1 });
    }
    router.push(`/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  };

  /* 조건 판의 "적용하기". 판에서 고른 것을 모두 실어 보내 필터 변경으로 기록한다. */
  const applyFilters = () =>
    void submit({
      region: region === "all" ? undefined : region,
      regionSigungus: region === "all" || sigungus.length === 0 ? undefined : sigungus,
      jobCategories: jobCategories.length > 0 ? jobCategories : undefined,
      isBeginnerFriendly: beginnerOnly || undefined,
      closingSoon: closingSoon || undefined,
    });

  const resetFilters = () => {
    setRegion("all");
    setSigungus([]);
    setJobCategories([]);
    setBeginnerOnly(false);
    setClosingSoon(false);
  };

  /* 시·도를 바꾸면 앞서 고른 구는 그 시·도의 것이 아니라 지워야 한다. */
  function selectRegion(next: string) {
    setRegion(next);
    setSigungus([]);
  }

  /*
    구는 다섯까지만 고르게 한다. 여섯 이상을 한 번에 보고 싶은 사람은
    대개 시·도 전체를 보는 편이 빠르다.
  */
  function toggleSigungu(name: string) {
    setSigungus((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= MAX_SIGUNGU) return prev;
      return [...prev, name];
    });
  }

  /* 넓은 화면의 왼쪽 칸과 좁은 화면의 시트가 함께 쓰는 조건 판. */
  const filterPanel = (
    <div className="flex flex-col">
      <FilterGroup title="지역">
        {/* 시·도는 열일곱 개라 체크 목록으로 펼치면 판이 너무 길다. 한 개만 고르므로 고르기 상자로 둔다. */}
        <div className="relative">
          <select
            value={region}
            onChange={(e) => selectRegion(e.target.value)}
            aria-label="시·도"
            className="h-11 w-full appearance-none rounded-lg border border-border bg-white pr-9 pl-3 text-body-2 font-medium text-slate-900"
          >
            <option value="all">전국</option>
            {Object.entries(REGION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500" />
        </div>
        {regionActive && (
          <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border">
            <CheckRow checked={sigungus.length === 0} onClick={() => setSigungus([])}>
              {REGION_LABELS[region as Region]} 전체
            </CheckRow>
            {SIGUNGU_BY_REGION[region as Region].map((name) => {
              const picked = sigungus.includes(name);
              return (
                <CheckRow
                  key={name}
                  checked={picked}
                  disabled={!picked && sigungus.length >= MAX_SIGUNGU}
                  onClick={() => toggleSigungu(name)}
                >
                  {name}
                </CheckRow>
              );
            })}
          </div>
        )}
        {sigungus.length >= MAX_SIGUNGU && (
          <p className="mt-1.5 text-label-2 text-slate-500">시·군·구는 {MAX_SIGUNGU}개까지 고를 수 있어요</p>
        )}
      </FilterGroup>

      <FilterGroup title="직종">
        <CheckRow checked={!jobActive} onClick={() => setJobCategories([])}>
          직종 전체
        </CheckRow>
        {extraCategories.map((key) => (
          <CheckRow key={key} checked onClick={() => toggleJobCategory(key)}>
            {labelOfJobCategory(key, jobCategoryLabel)}
          </CheckRow>
        ))}
        {JOB_CATEGORY_GROUPS.map((group) => (
          <CheckRow key={group.key} checked={jobCategories.includes(group.key)} onClick={() => toggleJobCategory(group.key)}>
            {group.label}
          </CheckRow>
        ))}
      </FilterGroup>

      <FilterGroup title="조건" last>
        <CheckRow checked={beginnerOnly} onClick={() => setBeginnerOnly(!beginnerOnly)}>
          신입 가능
        </CheckRow>
        <CheckRow checked={closingSoon} onClick={() => setClosingSoon(!closingSoon)}>
          7일 안에 마감
        </CheckRow>
      </FilterGroup>
    </div>
  );

  /* 초기화·적용하기. 라벨 "적용하기"는 비로그인 문지기(GuestGate)가 알아보는 말이라 바꾸지 않는다. */
  const panelActions = (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={resetFilters}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 py-3 text-label-1 font-medium text-slate-600 hover:bg-slate-50"
      >
        <RotateCcw className="size-3.5" /> 초기화
      </button>
      <button
        type="button"
        onClick={applyFilters}
        className="flex-1 rounded-lg bg-brand-blue-600 px-4 py-3 text-body-2 font-semibold text-white hover:bg-brand-blue-700"
      >
        적용하기
      </button>
    </div>
  );

  return (
    <div>
      {/* 검색어. 지역·직종은 아래 조건 판이 맡아 검색바는 글자만 받는다. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex h-14 items-center rounded-lg border-[1.5px] border-border bg-white sm:h-16"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 pr-2 pl-5 sm:pl-6">
          <Search className="size-[18px] shrink-0 text-slate-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="예: 요양보호사, 경비, 조리"
            aria-label="검색어"
            className="w-full min-w-0 border-0 bg-transparent text-body-2 text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
        <button
          type="submit"
          className="m-1.5 flex h-11 shrink-0 items-center gap-2 rounded-lg bg-brand-blue-600 px-6 text-body-2 font-semibold text-white transition-colors hover:bg-brand-blue-700 sm:h-[52px] sm:px-8"
        >
          <Search className="size-4" strokeWidth={2.2} />
          검색
        </button>
      </form>

      {/* 좁은 화면: 조건 판을 여는 버튼. 몇 가지가 걸려 있는지 함께 적는다. */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white py-3 text-body-2 font-semibold text-slate-700 lg:hidden"
      >
        <SlidersHorizontal className="size-4" />
        지역·직종·조건 선택
        {appliedCount > 0 && (
          <span className="rounded-full bg-brand-blue-600 px-2 py-0.5 text-label-2 font-semibold text-white">{appliedCount}</span>
        )}
      </button>

      <div className="mt-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* 넓은 화면: 왼쪽에 늘 펼친 조건 판. 목록을 내려도 따라오도록 머리글 아래에 붙인다. */}
        <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] flex-col rounded-xl border border-border bg-white lg:flex">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-body-1 font-bold text-slate-900">조건 선택</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5">{filterPanel}</div>
          <div className="border-t border-border p-4">{panelActions}</div>
        </aside>

        <div className="min-w-0">
          {curation}

          {/* 건수는 왼쪽, 정렬은 오른쪽 끝. */}
          <div className="flex flex-wrap items-center gap-3">
            {summary}
            <div className="relative ml-auto">
              {sortOpen && (
                <button
                  type="button"
                  aria-label="정렬 닫기"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setSortOpen(false)}
                />
              )}
              <button
                type="button"
                onClick={() => setSortOpen(!sortOpen)}
                className={cn(filterPillClass, filterPillOffClass, "relative z-40 flex items-center gap-1.5")}
              >
                {SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "추천순"}
                <ChevronDown className={cn("size-3.5 transition-transform", sortOpen && "rotate-180")} />
              </button>

              {sortOpen && (
                <div className="absolute top-[calc(100%+8px)] right-0 z-50 w-40 rounded-xl border border-border bg-white p-1.5 shadow-[0_12px_32px_rgba(15,40,90,0.12)]">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSort(opt.value);
                        void submit({ sort: opt.value });
                      }}
                      className={cn(
                        "block w-full rounded-lg px-3 py-2 text-left text-label-1",
                        sort === opt.value ? "bg-slate-100 font-semibold text-slate-900" : "font-medium text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {children}
        </div>
      </div>

      {/* 좁은 화면의 조건 시트. 헤더(z-50) 위로 올려 그늘이 화면 전체를 덮게 한다. */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="조건 선택 닫기"
            className="absolute inset-0 cursor-default bg-slate-900/30"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-[0_-8px_32px_rgba(15,40,90,0.18)]">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-body-1 font-bold text-slate-900">조건 선택</h2>
              <button
                type="button"
                aria-label="조건 선택 닫기"
                onClick={() => setSheetOpen(false)}
                className="-mr-2 rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5">{filterPanel}</div>
            <div className="border-t border-border p-4">{panelActions}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 조건 판의 한 묶음(지역·직종·조건). 묶음 사이는 선으로 가른다. */
function FilterGroup({ title, last, children }: { title: string; last?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("py-5", !last && "border-b border-border")}>
      <h3 className="mb-2.5 text-body-2 font-bold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

/**
 * 체크 한 줄. 기본 체크박스는 작아 누르기 어렵다 - 줄 전체를 누르는 자리로 둔다.
 * 고르지 않은 줄에도 네모를 남겨, 여러 개를 고를 수 있다는 것이 보이게 한다.
 */
function CheckRow({
  checked,
  disabled,
  onClick,
  children,
}: {
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-body-2 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
        checked ? "font-semibold text-slate-900" : "font-medium text-slate-700",
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
          checked ? "border-brand-blue-600 bg-brand-blue-600 text-white" : "border-slate-300 bg-white",
        )}
      >
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}
