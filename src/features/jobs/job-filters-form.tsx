"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, RotateCcw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterPillClass, filterPillOffClass, filterPillOnClass } from "@/lib/ui-classes";
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
  profileRegion,
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
   * 취업 프로필의 희망지역. 서버(/jobs)가 지역을 안 고른 회원에게 이 값을 기본 필터로 건다.
   * 그래서 회원이 "지역 전체"를 고를 때는 region 을 비우는 대신 region=all 을 실어야
   * 서버가 기본값을 다시 걸지 않는다.
   */
  profileRegion?: string;
  /**
   * 검색바 위에 들어갈 내용(큐레이션 섹션 등).
   * 검색바는 아래 목록을 좁히는 도구라 목록에 붙어 있어야 하고, 둘러보라고 권하는 띠는
   * 그보다 위에 온다. 상태가 이 컴포넌트 안에 있어 DOM을 쪼갤 수 없어 children으로 연다.
   */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [keyword, setKeyword] = useState(initial.keyword ?? "");
  const [region, setRegion] = useState(initial.region ?? "all");
  const [sigungus, setSigungus] = useState<string[]>(initial.regionSigungus ?? []);
  const [jobCategories, setJobCategories] = useState<string[]>(initial.jobCategories ?? []);
  const [beginnerOnly, setBeginnerOnly] = useState(Boolean(initial.isBeginnerFriendly));
  const [closingSoon, setClosingSoon] = useState(Boolean(initial.closingSoon));
  const [sort, setSort] = useState<JobSortOrder>(initial.sort ?? "recommended");

  const regionActive = region !== "all";
  /*
    버튼에는 고른 데까지 적는다. "서울"만 적으면 구까지 좁힌 것이 안 보인다.
    여럿이면 앞의 하나만 적고 나머지는 수로 센다 - 셋 넷을 늘어놓으면 버튼이 검색창을 밀어낸다.
  */
  const regionLabel = !regionActive
    ? "지역 전체"
    : sigungus.length === 0
      ? REGION_LABELS[region as Region]
      : sigungus.length === 1
        ? `${REGION_LABELS[region as Region]} ${sigungus[0]}`
        : `${sigungus[0]} 외 ${sigungus.length - 1}`;
  const jobActive = jobCategories.length > 0;
  /* 직종 이름: 묶음에서 찾고, 없으면(직업진단에서 온 코드) 서버가 넘겨준 이름을 쓴다.
     여럿이면 지역과 같게 앞의 하나만 적고 나머지는 수로 센다. */
  const selectedJobLabel = !jobActive
    ? "직종 전체"
    : jobCategories.length === 1
      ? labelOfJobCategory(jobCategories[0], jobCategoryLabel)
      : `${labelOfJobCategory(jobCategories[0], jobCategoryLabel)} 외 ${jobCategories.length - 1}`;

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

  /* 여러 개를 고를 수 있어 지역 목록처럼 앞에 체크를 둔다. 고르지 않은 칸에도 자리를 남긴다. */
  const cellClass = (selected: boolean) =>
    cn(
      "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-center text-label-1 whitespace-nowrap transition-colors",
      selected
        ? "border-brand-blue-400 bg-brand-blue-50 font-semibold text-brand-blue-600"
        : "border-border bg-white font-medium text-slate-600 hover:border-brand-blue-200 hover:bg-brand-blue-50/40",
    );

  /* 시·도를 바꾸면 앞서 고른 구는 그 시·도의 것이 아니라 지워야 한다. */
  function selectRegion(next: string) {
    setRegion(next);
    setSigungus([]);
  }

  /*
    구는 다섯까지만 고르게 한다. 더 담아도 버튼에 다 적지 못하고, 여섯 이상을 한 번에
    보고 싶은 사람은 대개 시·도 전체를 보는 편이 빠르다.
  */
  function toggleSigungu(name: string) {
    setSigungus((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= MAX_SIGUNGU) return prev;
      return [...prev, name];
    });
  }

  const sidoClass = (selected: boolean) =>
    cn(
      "block w-full px-4 py-3 text-left text-label-1 transition-colors",
      selected ? "bg-white font-semibold text-brand-blue-600" : "font-medium text-slate-600 hover:bg-white/70",
    );

  const sigunguClass = (selected: boolean) =>
    cn(
      "flex w-full items-center gap-2 px-4 py-3 text-left text-label-1 transition-colors disabled:cursor-not-allowed",
      selected ? "font-semibold text-brand-blue-600" : "font-medium text-slate-700 hover:bg-slate-50",
    );

  /* 고르지 않은 줄에도 자리를 남긴다. 표시가 있고 없고로 글자가 좌우로 밀리면 목록이 흔들린다. */
  const checkClass = (selected: boolean) =>
    cn("size-4 shrink-0 transition-colors", selected ? "text-brand-blue-600" : "text-slate-200");

  /*
    좁은 화면은 아래에서 올라오는 시트로 연다. 목록이 두 칸이라 드롭다운으로 띄우면
    화면 가운데를 덮으면서도 아래가 잘린다.
  */
  /*
    좁은 화면은 아래에서 올라오는 시트, 넓은 화면은 누른 버튼 아래 떠 있는 판이다.
    넓은 화면에서 검색바 폭을 다 쓰면 목록이 몇 줄 안 되는데 판만 넓어 허전하다.
    내용에 맞춰 480px 로 잡고 오른쪽(버튼이 있는 쪽)에 붙인다.
  */
  const sheetClass =
    "fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white shadow-[0_-8px_32px_rgba(15,40,90,0.18)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+12px)] sm:bottom-auto sm:w-[30rem] sm:rounded-2xl sm:border sm:border-border sm:p-6 sm:shadow-[0_16px_48px_rgba(15,40,90,0.14)]";
  const sheetHeadClass = "flex items-center justify-between px-5 pt-5 sm:px-0 sm:pt-0";
  const sheetFootClass = "flex items-center justify-between gap-3 px-5 py-4 sm:px-0 sm:pt-4 sm:pb-0";
  const resetClass =
    "flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-label-1 font-medium text-slate-600 hover:bg-slate-50";
  const applyClass =
    "flex-1 rounded-lg bg-brand-blue-400 px-5 py-2.5 text-label-1 font-semibold text-white hover:bg-brand-blue-600 sm:flex-none sm:px-8";


  /* 좁은 화면에서 아래에서 올라오는 시트로 여는 패널. 정렬은 작은 드롭다운이라 뺀다. */
  const isSheet = panel === "region" || panel === "job";

  return (
    <div>
      {/* 패널 밖 클릭 시 닫기. 시트는 아래 그늘이 같은 일을 하므로 좁은 화면에서는 비켜둔다. */}
      {panel && (
        <button
          type="button"
          aria-label="필터 닫기"
          className={cn("fixed inset-0 z-40 cursor-default", isSheet && "hidden sm:block")}
          onClick={() => setPanel(null)}
        />
      )}

      {children}

      {/* 시트가 열린 동안만 헤더(z-50) 위로 올라가, 그늘이 헤더까지 덮게 한다. */}
      <div className={cn("relative", isSheet ? "z-[60] sm:z-40" : "z-40")}>
        {/* 알약형 검색바 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex h-14 items-center rounded-lg border-[1.5px] border-border bg-white shadow-[0_4px_20px_rgba(15,40,90,0.06)] sm:h-16"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-5 pr-2 sm:pl-6">
            <Search className="size-[18px] shrink-0 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="예: 요양보호사, 경비, 조리"
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
            {regionLabel}
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
            className="m-1.5 flex h-11 shrink-0 items-center gap-2 rounded-lg bg-brand-blue-400 px-6 text-body-2 font-semibold text-white transition-colors hover:bg-brand-blue-600 sm:h-[52px] sm:px-7"
          >
            <Search className="size-4" strokeWidth={2.2} />
            검색
          </button>
        </form>

        {/* 모바일: 지역/직종 버튼을 바 아래로 */}
        <div className="mt-2 flex gap-2 sm:hidden">
          {(
            [
              ["region", regionLabel],
              ["job", jobActive ? selectedJobLabel : "직종 전체"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPanel(panel === key ? null : key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-4 py-2.5 text-label-1",
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

        {/*
          시트 뒤 그늘. 검색바와 같은 칸 안에 두어야 검색바까지 덮는다(밖에 두면 검색바가 위에
          그려져 거기만 훤히 남는다). 밖을 누르면 닫히는 것도 이 그늘이 받는다.
          넓은 화면은 시트가 아니라 검색바 아래 판이라 그늘을 두지 않는다.
        */}
        {isSheet && (
          <button
            type="button"
            aria-label="필터 닫기"
            className="fixed inset-0 z-40 cursor-default bg-slate-900/30 sm:hidden"
            onClick={() => setPanel(null)}
          />
        )}

        {/*
          지역 패널.
          시·도만으로는 "서울"이 통째로 걸려 사는 동네에서 다닐 만한 공고를 못 고른다.
          왼쪽에서 시·도, 오른쪽에서 시·군·구를 고른다.
          좁은 화면에서는 아래에서 올라오는 시트, 넓은 화면에서는 검색바 아래 판이다.
        */}
        {panel === "region" && (
          <div className={sheetClass}>
            <div className={sheetHeadClass}>
              <span className="text-body-2 font-bold text-slate-900">지역</span>
              <button
                type="button"
                aria-label="지역 선택 닫기"
                onClick={() => setPanel(null)}
                className="-mr-2 rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* 좁은 화면에서도 상자로 보이게 좌우를 띄우고 각을 준다. 안쪽 회색 칸이 모서리 밖으로
                삐져나오지 않게 overflow-hidden 을 함께 건다. */}
            <div className="mt-4 mx-5 flex h-[19rem] overflow-hidden rounded-xl border border-border sm:mx-0 sm:h-64">
              {/* 왼쪽: 시·도 */}
              {/* 두 칸은 바탕색으로 갈린다. 선까지 그으면 목록 사이에 벽이 하나 더 생긴다. */}
              <div className="w-[7.5rem] shrink-0 overflow-y-auto bg-slate-50 sm:w-36">
                <button type="button" className={sidoClass(!regionActive)} onClick={() => selectRegion("all")}>
                  전국
                </button>
                {Object.entries(REGION_LABELS).map(([value, label]) => (
                  <button key={value} type="button" className={sidoClass(region === value)} onClick={() => selectRegion(value)}>
                    {label}
                    {/* 다른 시·도를 보는 동안에도 몇 개를 골라뒀는지 남겨 둔다. */}
                    {region === value && sigungus.length > 0 && (
                      <span className="ml-1 font-bold text-brand-blue-600">{sigungus.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* 오른쪽: 고른 시·도의 시·군·구 */}
              <div className="flex-1 overflow-y-auto">
                {!regionActive ? (
                  <p className="px-4 py-5 text-label-1 break-keep text-slate-400">
                    왼쪽에서 시·도를 고르면 시·군·구를 고를 수 있어요.
                  </p>
                ) : (
                  <>
                    <button type="button" className={sigunguClass(sigungus.length === 0)} onClick={() => setSigungus([])}>
                      <Check className={checkClass(sigungus.length === 0)} />
                      {REGION_LABELS[region as Region]} 전체
                    </button>
                    {SIGUNGU_BY_REGION[region as Region].map((name) => {
                      const picked = sigungus.includes(name);
                      const full = !picked && sigungus.length >= MAX_SIGUNGU;
                      return (
                        <button
                          key={name}
                          type="button"
                          disabled={full}
                          className={cn(sigunguClass(picked), full && "text-slate-300")}
                          onClick={() => toggleSigungu(name)}
                        >
                          <Check className={checkClass(picked)} />
                          {name}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

            {/* 고른 것을 아래에 늘어놓는다. 목록을 훑는 동안 지금 무엇이 걸려 있는지 보여야 한다. */}
            {sigungus.length > 0 && (
              <div className="flex flex-wrap gap-2 px-5 pt-4 sm:px-0">
                {sigungus.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleSigungu(name)}
                    className="flex items-center gap-1 rounded-lg bg-slate-100 py-1.5 pr-2 pl-3 text-label-2 font-medium text-slate-600 hover:bg-slate-200"
                  >
                    {REGION_LABELS[region as Region]} &gt; {name}
                    <X className="size-3.5 text-slate-400" />
                  </button>
                ))}
                {sigungus.length >= MAX_SIGUNGU && (
                  <span className="self-center text-label-2 text-slate-400">최대 {MAX_SIGUNGU}개까지 고를 수 있어요</span>
                )}
              </div>
            )}

            <div className={sheetFootClass}>
              <button type="button" onClick={() => selectRegion("all")} className={resetClass}>
                <RotateCcw className="size-3.5" /> 초기화
              </button>
              <button
                type="button"
                onClick={() =>
                  void submit({
                    region: region === "all" ? undefined : region,
                    regionSigungus: region === "all" || sigungus.length === 0 ? undefined : sigungus,
                  })
                }
                className={applyClass}
              >
                적용하기
              </button>
            </div>
          </div>
        )}

        {/* 직종 패널. 지역 패널과 같은 껍데기(제목 줄·닫기·초기화·적용하기)를 쓴다. */}
        {panel === "job" && (
          <div className={sheetClass}>
            <div className={sheetHeadClass}>
              <span className="text-body-2 font-bold text-slate-900">직종</span>
              <button
                type="button"
                aria-label="직종 선택 닫기"
                onClick={() => setPanel(null)}
                className="-mr-2 rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* 목록이 한 화면에 다 들어와 검색칸이 필요 없다. */}
            <div className="mt-4 max-h-[19rem] overflow-y-auto px-5 sm:max-h-none sm:px-0">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button type="button" className={cellClass(!jobActive)} onClick={() => setJobCategories([])}>
                  <Check className={checkClass(!jobActive)} />
                  직종 전체
                </button>
                {JOB_CATEGORY_GROUPS.map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    className={cellClass(jobCategories.includes(group.key))}
                    onClick={() => toggleJobCategory(group.key)}
                  >
                    <Check className={checkClass(jobCategories.includes(group.key))} />
                    {group.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={sheetFootClass}>
              <button type="button" onClick={() => setJobCategories([])} className={resetClass}>
                <RotateCcw className="size-3.5" /> 초기화
              </button>
              <button
                type="button"
                onClick={() => void submit({ jobCategories: jobCategories.length > 0 ? jobCategories : undefined })}
                className={applyClass}
              >
                적용하기
              </button>
            </div>
          </div>
        )}

      </div>

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
