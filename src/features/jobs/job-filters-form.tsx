"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, RotateCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterPillClass, filterPillOffClass, filterPillOnClass } from "@/lib/ui-classes";
import { REGION_LABELS } from "@/lib/labels";
import { mockJobRoles } from "@/mocks/job-roles.mock";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import { trackJobFilterChangedAction, trackJobSearchAction } from "@/features/jobs/job-actions";
import type { JobSortOrder } from "@/types";

const SORT_OPTIONS: { value: JobSortOrder; label: string }[] = [
  { value: "recommended", label: "추천순" },
  { value: "latest", label: "최신순" },
  { value: "deadline", label: "마감임박순" },
  { value: "salary_desc", label: "급여높은순" },
];

export interface JobFiltersValue {
  keyword?: string;
  jobCategory?: string;
  region?: string;
  isBeginnerFriendly?: boolean;
  closingSoon?: boolean;
  sort?: JobSortOrder;
}

type Panel = "region" | "job" | "sort" | null;

/**
 * 채용공고 검색바 (필터 패널형 디자인).
 * 알약형 검색바 + 지역/직종 드롭다운 패널 + 빠른 토글 칩 + 정렬.
 * 제출 시 서버 컴포넌트(/jobs)가 다시 렌더링되도록 쿼리스트링 기반 네비게이션을 사용한다.
 */
export function JobFiltersForm({
  initial,
  children,
  summary,
  jobCategoryLabel,
}: {
  initial: JobFiltersValue;
  /** 결과 건수처럼 토글 줄 왼쪽에 함께 놓을 요약 문구. */
  summary?: React.ReactNode;
  /**
   * 직종 선택기 목록(mockJobRoles)에 없는 코드로 들어온 경우의 이름.
   * 직업진단 결과에서 넘어오는 코드는 이 목록에 없어서, 없으면 필터가 걸렸는데도
   * 버튼에 "직종"만 떠 무엇으로 좁혀졌는지 알 수 없었다.
   */
  jobCategoryLabel?: string;
  /**
   * 검색바와 빠른 토글 줄 사이에 들어갈 내용(큐레이션 섹션 등).
   * 토글·정렬은 아래 목록에 적용되는 조건이라 목록 바로 위에 있어야 읽히는데,
   * 상태가 이 컴포넌트 안에 있어 DOM을 쪼갤 수 없다. 그래서 사이를 children으로 연다.
   */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [keyword, setKeyword] = useState(initial.keyword ?? "");
  const [region, setRegion] = useState(initial.region ?? "all");
  const [jobCategory, setJobCategory] = useState(initial.jobCategory ?? "all");
  const [jobQuery, setJobQuery] = useState("");
  const [beginnerOnly, setBeginnerOnly] = useState(Boolean(initial.isBeginnerFriendly));
  const [closingSoon, setClosingSoon] = useState(Boolean(initial.closingSoon));
  const [sort, setSort] = useState<JobSortOrder>(initial.sort ?? "recommended");

  const regionActive = region !== "all";
  const jobActive = jobCategory !== "all";
  const roleOptions = mockJobRoles.filter((r) => r.name.includes(jobQuery.trim()));
  // 선택된 직종 이름: 목록에서 찾고, 없으면 서버가 넘겨준 이름을 쓴다.
  const selectedJobLabel =
    mockJobRoles.find((r) => r.jobCategory === jobCategory)?.name ?? jobCategoryLabel ?? "선택한 직종";

  const buildParams = (overrides: Partial<JobFiltersValue> = {}) => {
    const next: JobFiltersValue = {
      keyword,
      region: region === "all" ? undefined : region,
      jobCategory: jobCategory === "all" ? undefined : jobCategory,
      isBeginnerFriendly: beginnerOnly || undefined,
      closingSoon: closingSoon || undefined,
      sort,
      ...overrides,
    };
    const params = new URLSearchParams();
    if (next.keyword) params.set("keyword", next.keyword);
    if (next.region) params.set("region", next.region);
    if (next.jobCategory) params.set("category", next.jobCategory);
    if (next.isBeginnerFriendly) params.set("beginner", "1");
    if (next.closingSoon) params.set("closingSoon", "1");
    if (next.sort && next.sort !== "recommended") params.set("sort", next.sort);
    return { next, params };
  };

  const submit = async (overrides: Partial<JobFiltersValue> = {}) => {
    setPanel(null);
    const { next, params } = buildParams(overrides);
    const anonymousId = getOrCreateAnonymousId();
    if (Object.keys(overrides).length > 0) {
      await trackJobFilterChangedAction({ anonymousId, filter: next as Record<string, unknown> });
    } else {
      await trackJobSearchAction({ anonymousId, keyword: next.keyword, filter: next as Record<string, unknown>, resultCount: -1 });
    }
    router.push(`/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const cellClass = (selected: boolean) =>
    cn(
      "rounded-lg border px-1 py-2.5 text-center text-label-1 whitespace-nowrap transition-colors",
      selected
        ? "border-brand-blue-400 bg-brand-blue-50 font-semibold text-brand-blue-600"
        : "border-border bg-white font-medium text-slate-600 hover:border-brand-blue-200 hover:bg-brand-blue-50/40",
    );

  const panelClass =
    "absolute inset-x-0 top-[calc(100%+12px)] z-50 rounded-2xl border border-border bg-white p-5 shadow-[0_16px_48px_rgba(15,40,90,0.14)] sm:p-7";

  return (
    <div>
      {/* 패널 밖 클릭 시 닫기 */}
      {panel && <button type="button" aria-label="필터 닫기" className="fixed inset-0 z-40 cursor-default" onClick={() => setPanel(null)} />}

      <div className="relative z-40">
        {/* 알약형 검색바 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex h-14 items-center rounded-full border-[1.5px] border-border bg-white shadow-[0_4px_20px_rgba(15,40,90,0.06)] sm:h-16"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-5 pr-2 sm:pl-6">
            <Search className="size-[18px] shrink-0 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="직업명, 회사명으로 검색"
              className="w-full min-w-0 border-0 bg-transparent text-body-2 text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          <span className="hidden h-7 w-px bg-border sm:block" />
          <button
            type="button"
            onClick={() => setPanel(panel === "region" ? null : "region")}
            className={cn(
              "hidden h-full shrink-0 items-center gap-2 px-5 text-body-2 sm:flex",
              regionActive ? "font-semibold text-brand-blue-600" : "font-medium text-slate-700",
            )}
          >
            {regionActive ? REGION_LABELS[region as keyof typeof REGION_LABELS] : "지역 전체"}
            <ChevronDown className={cn("size-3.5 transition-transform", panel === "region" && "rotate-180")} />
          </button>

          <span className="hidden h-7 w-px bg-border sm:block" />
          <button
            type="button"
            onClick={() => setPanel(panel === "job" ? null : "job")}
            className={cn(
              "hidden h-full shrink-0 items-center gap-2 px-5 text-body-2 sm:flex",
              jobActive ? "font-semibold text-brand-blue-600" : "font-medium text-slate-700",
            )}
          >
            {jobActive ? selectedJobLabel : "직종 전체"}
            <ChevronDown className={cn("size-3.5 transition-transform", panel === "job" && "rotate-180")} />
          </button>

          <button
            type="submit"
            className="m-1.5 flex h-11 shrink-0 items-center gap-2 rounded-full bg-brand-blue-400 px-6 text-body-2 font-semibold text-white transition-colors hover:bg-brand-blue-600 sm:h-[52px] sm:px-7"
          >
            <Search className="size-4" strokeWidth={2.2} />
            검색
          </button>
        </form>

        {/* 모바일: 지역/직종 버튼을 바 아래로 */}
        <div className="mt-2 flex gap-2 sm:hidden">
          {(
            [
              ["region", regionActive ? REGION_LABELS[region as keyof typeof REGION_LABELS] : "지역 전체"],
              ["job", jobActive ? selectedJobLabel : "직종 전체"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPanel(panel === key ? null : key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full border px-4 py-2.5 text-label-1",
                (key === "region" ? regionActive : jobActive)
                  ? "border-brand-blue-300 bg-brand-blue-50 font-semibold text-brand-blue-600"
                  : "border-border bg-white font-medium text-slate-600",
              )}
            >
              {label}
              <ChevronDown className="size-3.5" />
            </button>
          ))}
        </div>

        {/* 지역 패널 */}
        {panel === "region" && (
          <div className={panelClass}>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-label-1 font-bold text-slate-900">지역 선택</span>
              <button
                type="button"
                onClick={() => setRegion("all")}
                className="flex items-center gap-1.5 text-label-2 text-slate-400 hover:text-slate-600"
              >
                선택 초기화 <RotateCcw className="size-3" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              <button type="button" className={cellClass(!regionActive)} onClick={() => setRegion("all")}>
                전국
              </button>
              {Object.entries(REGION_LABELS).map(([value, label]) => (
                <button key={value} type="button" className={cellClass(region === value)} onClick={() => setRegion(value)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setPanel(null)} className="rounded-full border border-border px-5 py-2 text-label-1 font-medium text-slate-600">
                닫기
              </button>
              <button
                type="button"
                onClick={() => void submit({ region: region === "all" ? undefined : region })}
                className="rounded-full bg-brand-blue-400 px-5 py-2 text-label-1 font-semibold text-white hover:bg-brand-blue-600"
              >
                적용
              </button>
            </div>
          </div>
        )}

        {/* 직종 패널 */}
        {panel === "job" && (
          <div className={panelClass}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex h-10 flex-1 items-center gap-2.5 rounded-lg border border-border px-3.5 sm:max-w-105">
                <Search className="size-4 shrink-0 text-slate-400" />
                <input
                  value={jobQuery}
                  onChange={(e) => setJobQuery(e.target.value)}
                  placeholder="직업(직무) 또는 전문분야 입력"
                  className="w-full border-0 bg-transparent text-label-1 outline-none placeholder:text-slate-400"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setJobCategory("all");
                  setJobQuery("");
                }}
                className="flex shrink-0 items-center gap-1.5 text-label-2 text-slate-400 hover:text-slate-600"
              >
                선택 초기화 <RotateCcw className="size-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              <button type="button" className={cellClass(!jobActive)} onClick={() => setJobCategory("all")}>
                직종 전체
              </button>
              {roleOptions.map((role) => (
                <button
                  key={role.jobCategory}
                  type="button"
                  className={cellClass(jobCategory === role.jobCategory)}
                  onClick={() => setJobCategory(role.jobCategory)}
                >
                  {role.name}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setPanel(null)} className="rounded-full border border-border px-5 py-2 text-label-1 font-medium text-slate-600">
                닫기
              </button>
              <button
                type="button"
                onClick={() => void submit({ jobCategory: jobCategory === "all" ? undefined : jobCategory })}
                className="rounded-full bg-brand-blue-400 px-5 py-2 text-label-1 font-semibold text-white hover:bg-brand-blue-600"
              >
                적용
              </button>
            </div>
          </div>
        )}

      </div>

      {children}

      {/*
        결과 건수·빠른 토글·정렬을 모두 왼쪽에 붙여 한 묶음으로 읽히게 한다.
        정렬만 오른쪽 끝에 텍스트로 떨어져 있으면 같은 목록을 다루는 조건인데 따로 놀았다.
      */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        {summary}
        {/* 건수는 왼쪽, 필터는 오른쪽 끝. ml-auto 라 줄이 접혀도 각자 제 끝에 붙는다. */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setBeginnerOnly(!beginnerOnly);
              void submit({ isBeginnerFriendly: !beginnerOnly || undefined });
            }}
            className={cn(filterPillClass, beginnerOnly ? filterPillOnClass : filterPillOffClass)}
          >
            신입가능만
          </button>
          <button
            type="button"
            onClick={() => {
              setClosingSoon(!closingSoon);
              void submit({ closingSoon: !closingSoon || undefined });
            }}
            className={cn(filterPillClass, closingSoon ? filterPillOnClass : filterPillOffClass)}
          >
            마감임박만
          </button>

          {/* 패널은 버튼 바로 아래에 붙어야 해서 이 버튼을 기준으로 위치를 잡는다. */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPanel(panel === "sort" ? null : "sort")}
              className={cn(filterPillClass, filterPillOffClass, "flex items-center gap-1.5")}
            >
              {SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "추천순"}
              <ChevronDown className={cn("size-3.5 transition-transform", panel === "sort" && "rotate-180")} />
            </button>

            {panel === "sort" && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-40 rounded-xl border border-border bg-white p-1.5 shadow-[0_12px_32px_rgba(15,40,90,0.12)]">
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
                      sort === opt.value
                        ? "bg-brand-blue-50 font-semibold text-brand-blue-600"
                        : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
