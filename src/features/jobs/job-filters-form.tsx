"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronLeft, RotateCcw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterPillClass, filterPillOffClass, filterPillOnClass } from "@/lib/ui-classes";
import { REGION_LABELS } from "@/lib/labels";
import { SIGUNGU_BY_REGION } from "@/lib/regions/sigungu-list";
import type { Region } from "@/types";
import { JOB_CATEGORY_GROUPS, jobCategoryLabel as labelOfJobCategory } from "@/lib/jobs/job-category-groups";
import {
  SALARY_FILTER_AMOUNTS,
  SALARY_FILTER_UNITS,
  salaryFilterLabel,
  salaryFilterShortLabel,
  type SalaryFilterUnit,
} from "@/lib/jobs/salary-filter";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import { trackJobFilterChangedAction, trackJobSearchAction } from "@/features/jobs/job-actions";
import { PageHead } from "@/components/layout/page-head";
import type { JobSortOrder } from "@/types";

/** 한 번에 고를 수 있는 시·군·구 수. */
const MAX_SIGUNGU = 5;

const SORT_OPTIONS: { value: JobSortOrder; label: string }[] = [
  { value: "recommended", label: "추천순" },
  { value: "latest", label: "최신순" },
  { value: "deadline", label: "마감임박순" },
  { value: "salary_desc", label: "급여높은순" },
];

/* 고르기 창 안의 칸. 고른 칸은 옅은 파랑 바탕 + 파란 테두리 + 체크. */
const choiceClass =
  "flex h-12 items-center justify-center gap-1.5 rounded-xl px-3 text-body-2 break-keep disabled:opacity-40";
const choiceOnClass = "bg-baro-blue-50 font-bold text-baro-blue-600 ring-2 ring-baro-blue ring-inset";
const choiceOffClass = "bg-white font-semibold text-slate-800 ring-1 ring-slate-300 ring-inset";

export interface JobFiltersValue {
  keyword?: string;
  /** 고른 직종. 여러 개를 고를 수 있고, 직업진단에서 넘어온 6자리 코드도 여기 실린다. */
  jobCategories?: string[];
  region?: string;
  /** 시·군·구 이름. 시·도를 고른 뒤에만 쓰고, 같은 시·도 안에서 여러 개 고를 수 있다. */
  regionSigungus?: string[];
  isBeginnerFriendly?: boolean;
  closingSoon?: boolean;
  /** 급여 받는 방식과 그 최소 금액(원). 금액 없이 방식만 고르면 그 방식 공고를 모두 본다. */
  salaryType?: SalaryFilterUnit;
  salaryAtLeast?: number;
  sort?: JobSortOrder;
}

/**
 * 일자리찾기 화면의 틀: 머리(제목) + 회색 바탕(추천 → 검색창 · 조건 줄 → 목록).
 *
 * 왼쪽에 조건 판을 늘 펼쳐 두던 것을 걷고, 지역 · 직종은 검색바 안에, 신입가능만 · 마감임박만은 건수 줄 오른쪽에 둔다.
 * 조건 판이 목록 폭을 1/4 가까이 차지해 카드가 두 장씩만 놓였고, 화면에 고를 것이 너무 많아 보였다.
 * 지역 · 직종은 누르면 큰 고르기 창이 뜨고, 고르면 바로 목록에 걸린다("전국" · "○○ 전체" · "직종 전체"는 누르는 즉시).
 * 신입가능만 · 마감임박만(7일 안)은 누를 때마다 바로 켜고 끈다.
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
  /** 공고 목록. 건수·정렬 줄 아래에 들어간다. */
  children?: React.ReactNode;
  /** 목록 맨 위에 둘 큐레이션 띠. */
  curation?: React.ReactNode;
  /** 결과 건수처럼 정렬 줄 왼쪽에 함께 놓을 요약 문구. */
  summary?: React.ReactNode;
  /**
   * 직종 목록에 없는 코드로 들어온 경우의 이름.
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
  const [sortOpen, setSortOpen] = useState(false);
  const [picker, setPicker] = useState<"region" | "job" | "salary" | null>(null);
  /*
    닫을 때도 부드럽게: 바로 지우지 않고 closing 으로 사라지는 움직임을 다 보인 뒤(onAnimationEnd) 지운다.
    움직임 줄이기를 켠 분은 움직임이 없어 끝 신호가 오지 않으므로 바로 지운다.
  */
  const [pickerClosing, setPickerClosing] = useState(false);
  /* 판을 바꿔 열 때 닫는 움직임이 끝나면 열 판. */
  const nextPicker = useRef<"region" | "job" | "salary" | null>(null);
  const closePicker = () => {
    nextPicker.current = null;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPicker(null);
      setPickerClosing(false);
    } else {
      setPickerClosing(true);
    }
  };
  /*
    다른 판이 열려 있을 때 바로 내용만 갈아 끼우면 높이 · 내용이 한 번에 툭 바뀌었다.
    열린 판을 먼저 닫는 움직임으로 보내고, 다 닫히면(onAnimationEnd) 새 판을 여는 움직임으로 띄운다.
  */
  const openPicker = (which: "region" | "job" | "salary") => {
    if (picker && picker !== which && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nextPicker.current = which;
      setPickerClosing(true);
      return;
    }
    nextPicker.current = null;
    setPicker(which);
    setPickerClosing(false);
  };
  /* 고르기 판은 목록 위에 겹쳐 뜨므로, 검색바 · 판 바깥을 누르면 닫는다. */
  const headRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!picker) return;
    const close = (e: PointerEvent) => {
      if (!headRef.current?.contains(e.target as Node)) closePicker();
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [picker]);
  const [keyword, setKeyword] = useState(initial.keyword ?? "");
  const [region, setRegion] = useState(initial.region ?? "all");
  const [sigungus, setSigungus] = useState<string[]>(initial.regionSigungus ?? []);
  const [jobCategories, setJobCategories] = useState<string[]>(initial.jobCategories ?? []);
  const [beginnerOnly, setBeginnerOnly] = useState(Boolean(initial.isBeginnerFriendly));
  const [closingSoon, setClosingSoon] = useState(Boolean(initial.closingSoon));
  const [salaryType, setSalaryType] = useState<SalaryFilterUnit | undefined>(initial.salaryType);
  const [salaryAtLeast, setSalaryAtLeast] = useState<number | undefined>(initial.salaryAtLeast);
  const [sort, setSort] = useState<JobSortOrder>(initial.sort ?? "recommended");

  const regionActive = region !== "all";
  const jobActive = jobCategories.length > 0;
  const salaryActive = salaryType !== undefined;
  const anyActive = regionActive || jobActive || salaryActive || beginnerOnly || closingSoon;
  const nameOfJob = (key: string) => labelOfJobCategory(key, jobCategoryLabel);

  /* 알약에 적을 말. 여럿을 골랐으면 첫 것 + "외 n". */
  const regionPillLabel = !regionActive
    ? "지역 전체"
    : sigungus.length === 0
      ? REGION_LABELS[region as Region]
      : `${REGION_LABELS[region as Region]} ${sigungus[0]}${sigungus.length > 1 ? ` 외 ${sigungus.length - 1}` : ""}`;
  const jobPillLabel = !jobActive
    ? "직종 전체"
    : `${nameOfJob(jobCategories[0])}${jobCategories.length > 1 ? ` 외 ${jobCategories.length - 1}` : ""}`;

  const buildParams = (overrides: Partial<JobFiltersValue> = {}) => {
    const next: JobFiltersValue = {
      keyword,
      region: region === "all" ? undefined : region,
      regionSigungus: region === "all" || sigungus.length === 0 ? undefined : sigungus,
      jobCategories: jobCategories.length > 0 ? jobCategories : undefined,
      isBeginnerFriendly: beginnerOnly || undefined,
      closingSoon: closingSoon || undefined,
      salaryType,
      salaryAtLeast,
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
    if (next.salaryType) {
      params.set("pay", next.salaryType);
      if (next.salaryAtLeast !== undefined) params.set("payMin", String(next.salaryAtLeast));
    }
    if (next.sort && next.sort !== "recommended") params.set("sort", next.sort);
    return { next, params };
  };

  /* 조건을 걸어 목록을 다시 부른다. 알약 · 고르기 창 · 정렬이 모두 여기로 온다. */
  const submit = async (overrides: Partial<JobFiltersValue> = {}) => {
    setSortOpen(false);
    if (picker) closePicker();
    const { next, params } = buildParams(overrides);
    setRegion(next.region ?? "all");
    setSigungus(next.regionSigungus ?? []);
    setJobCategories(next.jobCategories ?? []);
    setBeginnerOnly(Boolean(next.isBeginnerFriendly));
    setClosingSoon(Boolean(next.closingSoon));
    setSalaryType(next.salaryType);
    setSalaryAtLeast(next.salaryType ? next.salaryAtLeast : undefined);
    const anonymousId = getOrCreateAnonymousId();
    if (Object.keys(overrides).length > 0) {
      await trackJobFilterChangedAction({ anonymousId, filter: next as Record<string, unknown> });
    } else {
      await trackJobSearchAction({ anonymousId, keyword: next.keyword, filter: next as Record<string, unknown>, resultCount: -1 });
    }
    router.push(`/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  };

  /* 검색바 안 지역 · 직종 칸. 고른 값이 있으면 파랑 굵은 글자로 걸려 있음을 보인다. */
  const pickerButtonClass = (active: boolean) =>
    cn(
      "flex min-w-0 items-center gap-1.5 text-body-2 whitespace-nowrap",
      active ? "font-bold text-baro-blue-600" : "font-semibold text-slate-800",
    );
  /* 누르면 검색바 아래로 고르기 판이 펼쳐지고, 다시 누르면 접힌다. */
  const pickerToggle = (which: "region" | "job" | "salary", label: string, active: boolean, className?: string) => (
    <button
      type="button"
      aria-expanded={picker === which && !pickerClosing}
      aria-controls="job-filter-panel"
      onClick={() => (picker === which && !pickerClosing ? closePicker() : openPicker(which))}
      className={cn(pickerButtonClass(active || (picker === which && !pickerClosing)), className)}
    >
      <span className="truncate">{label}</span>
      <ChevronDown aria-hidden className={cn("size-4 shrink-0 transition-transform", picker === which && !pickerClosing && "rotate-180")} strokeWidth={2.2} />
    </button>
  );
  const regionButton = (className?: string) => pickerToggle("region", regionPillLabel, regionActive, className);
  const jobButton = (className?: string) => pickerToggle("job", jobPillLabel, jobActive, className);
  const salaryButton = (className?: string) =>
    pickerToggle("salary", salaryType ? salaryFilterShortLabel(salaryType, salaryAtLeast) : "급여", salaryActive, className);

  const head = (
    <div ref={headRef} className="relative">
      {/*
        검색바 하나에 검색어 | 지역 | 직종 | 급여 | 검색 단추를 모은다(기존 job24 검색바 구성에 급여를 더함).
        지역 · 직종은 누르면 고르기 창이 뜨고 고르면 바로 걸린다. 고르기 창을 여는 것은 둘러보기라 비로그인에게도 열어 둔다.
        좁은 화면은 한 줄에 다 안 들어가 지역 · 직종 · 급여를 검색바 아래 세 칸으로 내린다.
      */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex h-14 items-center rounded-xl bg-white shadow-[0_4px_16px_rgba(15,40,90,0.06)] ring-1 ring-[#DDE3EC] ring-inset sm:h-16"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 pr-2 pl-5 sm:pl-6">
          <Search className="size-[18px] shrink-0 text-slate-500" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="예: 요양보호사, 경비, 조리"
            aria-label="검색어"
            className="w-full min-w-0 border-0 bg-transparent text-body-2 font-medium text-slate-900 outline-none placeholder:text-slate-500"
          />
        </div>
        <span aria-hidden className="hidden h-7 w-px shrink-0 bg-slate-200 sm:block" />
        {regionButton("hidden h-full max-w-56 px-5 sm:flex")}
        <span aria-hidden className="hidden h-7 w-px shrink-0 bg-slate-200 sm:block" />
        {jobButton("hidden h-full max-w-56 px-5 sm:flex")}
        <span aria-hidden className="hidden h-7 w-px shrink-0 bg-slate-200 sm:block" />
        {salaryButton("hidden h-full max-w-56 px-5 sm:flex")}
        <button
          type="submit"
          className="m-1.5 flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand-blue-600 px-6 text-body-2 font-semibold text-white sm:h-[52px] sm:px-8"
        >
          <Search className="size-4" strokeWidth={2.2} />
          검색
        </button>
      </form>
      {/* 세 칸이라 휴대폰 폭에서는 글자를 한 단계 줄이고 옆 여백을 좁힌다. */}
      <div className="mt-2 grid grid-cols-3 gap-2 sm:hidden">
        {regionButton("h-12 justify-between rounded-xl bg-white px-3 text-body-3 ring-1 ring-[#DDE3EC] ring-inset")}
        {jobButton("h-12 justify-between rounded-xl bg-white px-3 text-body-3 ring-1 ring-[#DDE3EC] ring-inset")}
        {salaryButton("h-12 justify-between rounded-xl bg-white px-3 text-body-3 ring-1 ring-[#DDE3EC] ring-inset")}
      </div>

      {/*
        고르기 판. 창(모달)을 띄우면 화면이 무겁게 바뀌어, 기존 job24 처럼 검색바 바로 아래로 펼친다.
        아래 목록을 밀어 내리면 화면이 들썩여, 목록 위에 겹쳐 띄운다(머리는 overflow-visible 로 연다).
        모서리는 화면의 다른 판 · 카드와 같은 rounded-card(20px).
        열릴 때는 살짝 위에서 내려오며 나타나고(0.2초), 닫힐 때는 거꾸로 올라가며 사라진다(0.15초).
        움직임 줄이기를 켠 분께는 움직임 없이 바로 보이고 바로 사라진다.
      */}
      {picker && (
        <div
          id="job-filter-panel"
          onKeyDown={(e) => e.key === "Escape" && closePicker()}
          onAnimationEnd={(e) => {
            if (e.target !== e.currentTarget || !pickerClosing) return;
            setPicker(nextPicker.current);
            nextPicker.current = null;
            setPickerClosing(false);
          }}
          className={cn(
            "absolute inset-x-0 top-full z-50 mt-3 flex max-h-[min(34rem,70vh)] flex-col overflow-hidden rounded-card bg-white shadow-[0_12px_32px_rgba(15,40,90,0.10)] ring-1 ring-[#DDE3EC] ring-inset motion-reduce:animate-none",
            pickerClosing
              ? "pointer-events-none animate-out fill-mode-forwards duration-150 ease-in fade-out-0 slide-out-to-top-2"
              : "animate-in duration-200 ease-out fade-in-0 slide-in-from-top-2",
          )}
        >
          {picker === "region" && (
            <RegionPicker
              region={region}
              sigungus={sigungus}
              onClose={closePicker}
              onApply={(r, s) =>
                void submit({ region: r === "all" ? undefined : r, regionSigungus: r === "all" || s.length === 0 ? undefined : s })
              }
            />
          )}
          {picker === "job" && (
            <JobPicker
              selected={jobCategories}
              nameOf={nameOfJob}
              onClose={closePicker}
              onApply={(keys) => void submit({ jobCategories: keys.length > 0 ? keys : undefined })}
            />
          )}
          {picker === "salary" && (
            <SalaryPicker
              unit={salaryType}
              atLeast={salaryAtLeast}
              onClose={closePicker}
              onApply={(u, a) => void submit({ salaryType: u, salaryAtLeast: a })}
            />
          )}
        </div>
      )}
    </div>
  );

  /*
    고른 조건 줄. 조건이 걸렸을 때만 검색바 바로 아래에 띄운다(기존 job24 구성).
    하나씩 ✕ 로 빼고, 끝의 "전체 초기화"로 한 번에 지운다. 초기화가 건수 줄에 있을 때는
    검색바와 멀어 무엇을 지우는지 이어지지 않았다. 목록을 다시 부르는 단추라 문지기(data-guest-gated)에 걸린다.
  */
  const chips: { key: string; label: string; remove: Partial<JobFiltersValue> }[] = [];
  if (regionActive) {
    const sido = REGION_LABELS[region as Region];
    if (sigungus.length === 0) {
      chips.push({ key: "region", label: sido, remove: { region: undefined, regionSigungus: undefined } });
    } else {
      for (const s of sigungus) {
        const rest = sigungus.filter((x) => x !== s);
        chips.push({ key: `sgg-${s}`, label: `${sido} ${s}`, remove: { regionSigungus: rest.length > 0 ? rest : undefined } });
      }
    }
  }
  for (const c of jobCategories) {
    const rest = jobCategories.filter((x) => x !== c);
    chips.push({ key: `job-${c}`, label: nameOfJob(c), remove: { jobCategories: rest.length > 0 ? rest : undefined } });
  }
  if (salaryType) {
    chips.push({ key: "salary", label: salaryFilterLabel(salaryType, salaryAtLeast), remove: { salaryType: undefined, salaryAtLeast: undefined } });
  }
  if (beginnerOnly) chips.push({ key: "beginner", label: "신입가능만", remove: { isBeginnerFriendly: undefined } });
  if (closingSoon) chips.push({ key: "closing", label: "마감임박만", remove: { closingSoon: undefined } });

  const chipRow = anyActive && (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          data-guest-gated
          onClick={() => void submit(c.remove)}
          aria-label={`${c.label} 조건 빼기`}
          className={cn(filterPillClass, filterPillOnClass, "flex items-center gap-1.5 whitespace-nowrap")}
        >
          {c.label}
          {/* 글자 먹 가운데가 X 보다 0.3px 위에 있어 X 가 처져 보였다 - 반 픽셀 올려 맞춘다. */}
          <X aria-hidden className="size-3.5 -translate-y-[0.5px]" strokeWidth={2.6} />
        </button>
      ))}
      <button
        type="button"
        data-guest-gated
        onClick={() =>
          void submit({
            region: undefined,
            regionSigungus: undefined,
            jobCategories: undefined,
            isBeginnerFriendly: undefined,
            closingSoon: undefined,
            salaryType: undefined,
            salaryAtLeast: undefined,
          })
        }
        className="ml-1 flex h-10 shrink-0 items-center gap-1 text-body-3 font-semibold whitespace-nowrap text-slate-700"
      >
        <RotateCcw aria-hidden className="size-3.5" strokeWidth={2.4} />
        전체 초기화
      </button>
    </div>
  );

  return (
    <>
      {/*
        차례는 지금 운영 중인 사이트와 같게: 추천(이런 일자리 어때요?) → 검색바 · 고른 조건 줄 → 전체 공고.
        추천은 흰 머리 안 제목 아래에 둔다 - 들어오자마자 볼 거리가 첫 화면에 있게. 판의 아래 여백(mb-8)은 머리 여백과 겹쳐 뺀다.
      */}
      <PageHead
        crumbs={[{ label: "일자리 찾기" }]}
        title="일자리 찾기"
        footer={curation && <div className="mt-6 sm:mt-8 [&>section]:mb-0">{curation}</div>}
      />

      {/* 흰 머리 아래 회색 바탕: 검색바 · 고른 조건 줄 → 전체 공고(흰 카드, 모서리 20px, 테두리 없음). */}
      <div className="bg-baro-page">
        <div className="mx-auto max-w-7xl px-4.5 pt-8 pb-16 lg:px-8">
          <div className="mb-8">
            {head}
            {chipRow}
          </div>

          {/*
            건수는 왼쪽, 신입가능만 · 마감임박만 · 정렬은 오른쪽 끝(기존 job24 구성). 두 거르기는 누를 때마다 바로 켜고 끈다.
            목록을 다시 부르는 단추라 문지기(data-guest-gated)에 걸린다.
          */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {summary}
            <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              data-guest-gated
              aria-pressed={beginnerOnly}
              onClick={() => void submit({ isBeginnerFriendly: !beginnerOnly || undefined })}
              className={cn(filterPillClass, beginnerOnly ? filterPillOnClass : filterPillOffClass, "flex items-center gap-1")}
            >
              {beginnerOnly && <Check aria-hidden className="size-3.5" strokeWidth={2.6} />}
              신입가능만
            </button>
            <button
              type="button"
              data-guest-gated
              aria-pressed={closingSoon}
              onClick={() => void submit({ closingSoon: !closingSoon || undefined })}
              className={cn(filterPillClass, closingSoon ? filterPillOnClass : filterPillOffClass, "flex items-center gap-1")}
            >
              {closingSoon && <Check aria-hidden className="size-3.5" strokeWidth={2.6} />}
              마감임박만
            </button>
            <div className="relative">
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
                        "block w-full rounded-lg px-3 py-2.5 text-left text-body-3",
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
          </div>

          {children}
        </div>
      </div>

    </>
  );
}

/**
 * 지역 고르기 창. 먼저 시·도(전국 + 17)를 큰 칸으로 고르고, 시·도를 누르면 그 안의 시·군·구로 넘어간다.
 * "전국"과 "○○ 전체"는 누르는 즉시 걸린다. 시·군·구는 다섯까지 골라 "적용하기"로 건다.
 * 이미 시·도가 걸려 있으면 그 시·도의 시·군·구 화면에서 연다.
 */
function RegionPicker({
  region,
  sigungus,
  onApply,
  onClose,
}: {
  region: string;
  sigungus: string[];
  onApply: (region: string, sigungus: string[]) => void;
  onClose: () => void;
}) {
  const [sido, setSido] = useState<Region | null>(region === "all" ? null : (region as Region));
  const [picked, setPicked] = useState<string[]>(region === "all" ? [] : sigungus);

  function toggle(name: string) {
    setPicked((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= MAX_SIGUNGU) return prev;
      return [...prev, name];
    });
  }

  if (!sido) {
    return (
      <>
        <PickerHead title="어느 지역 일자리를 볼까요?" onClose={onClose} />
        <div className="grid min-h-0 grid-cols-3 gap-2 overflow-y-auto px-5 pb-5 sm:grid-cols-6 sm:px-6 sm:pb-6 lg:grid-cols-9">
          <button
            type="button"
            data-guest-gated
            onClick={() => onApply("all", [])}
            className={cn(choiceClass, region === "all" ? choiceOnClass : choiceOffClass)}
          >
            전국
          </button>
          {(Object.entries(REGION_LABELS) as [Region, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setSido(value);
                setPicked(value === region ? sigungus : []);
              }}
              className={cn(choiceClass, value === region ? choiceOnClass : choiceOffClass)}
            >
              {label}
            </button>
          ))}
        </div>
      </>
    );
  }

  const sidoLabel = REGION_LABELS[sido];
  return (
    <>
      <PickerHead
        title={`${sidoLabel}에서 어디를 볼까요?`}
        back={
          <button
            type="button"
            onClick={() => setSido(null)}
            className="-ml-2 flex h-10 items-center gap-0.5 px-2 text-body-3 font-semibold text-slate-700"
          >
            <ChevronLeft aria-hidden className="size-4" />
            시·도 다시 고르기
          </button>
        }
        note={`${MAX_SIGUNGU}곳까지 고를 수 있어요.`}
        onClose={onClose}
      />
      <div className="grid min-h-0 grid-cols-2 gap-2 overflow-y-auto px-5 pb-4 sm:grid-cols-4 sm:px-6 lg:grid-cols-6">
        <button
          type="button"
          data-guest-gated
          onClick={() => onApply(sido, [])}
          className={cn(choiceClass, picked.length === 0 ? choiceOnClass : choiceOffClass)}
        >
          {sidoLabel} 전체
        </button>
        {SIGUNGU_BY_REGION[sido].map((name) => {
          const on = picked.includes(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              disabled={!on && picked.length >= MAX_SIGUNGU}
              onClick={() => toggle(name)}
              className={cn(choiceClass, on ? choiceOnClass : choiceOffClass)}
            >
              {on && <Check aria-hidden className="size-4 shrink-0" strokeWidth={2.6} />}
              {name}
            </button>
          );
        })}
      </div>
      <PickerFoot disabled={picked.length === 0} count={picked.length} unit="곳" onApply={() => onApply(sido, picked)} />
    </>
  );
}

/** 직종 고르기 창. "직종 전체"는 누르는 즉시 걸리고, 여러 직종은 골라서 "적용하기"로 건다. */
function JobPicker({
  selected,
  nameOf,
  onApply,
  onClose,
}: {
  selected: string[];
  nameOf: (key: string) => string;
  onApply: (keys: string[]) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string[]>(selected);
  /* 직업진단에서 넘어온 코드처럼 묶음 목록에 없는 직종. 목록 맨 앞에 둔다. */
  const keys = [
    ...selected.filter((key) => !JOB_CATEGORY_GROUPS.some((g) => g.key === key)),
    ...JOB_CATEGORY_GROUPS.map((g) => g.key),
  ];
  const toggle = (key: string) => setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <>
      <PickerHead title="어떤 일을 찾으세요?" note="여러 개를 함께 고를 수 있어요." onClose={onClose} />
      <div className="grid min-h-0 grid-cols-2 gap-2 overflow-y-auto px-5 pb-4 sm:grid-cols-4 sm:px-6 lg:grid-cols-5">
        <button
          type="button"
          data-guest-gated
          onClick={() => onApply([])}
          className={cn(choiceClass, picked.length === 0 ? choiceOnClass : choiceOffClass)}
        >
          직종 전체
        </button>
        {keys.map((key) => {
          const on = picked.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(key)}
              className={cn(choiceClass, on ? choiceOnClass : choiceOffClass)}
            >
              {on && <Check aria-hidden className="size-4 shrink-0" strokeWidth={2.6} />}
              {nameOf(key)}
            </button>
          );
        })}
      </div>
      <PickerFoot disabled={picked.length === 0} count={picked.length} unit="개" onApply={() => onApply(picked)} />
    </>
  );
}

function PickerHead({
  title,
  back,
  note,
  onClose,
}: {
  title: string;
  back?: React.ReactNode;
  note?: string;
  onClose: () => void;
}) {
  return (
    <div className="relative shrink-0 px-5 pt-5 pb-4 sm:px-6">
      {back}
      <p className="pr-12 text-title-3 font-extrabold break-keep text-slate-900">{title}</p>
      {note && <p className="mt-1 text-body-3 font-medium break-keep text-slate-600">{note}</p>}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full text-slate-600"
      >
        <X aria-hidden className="size-5" />
      </button>
    </div>
  );
}

/** 고르기 창 아래 "적용하기". 이 말은 비로그인 문지기(GuestGate)가 알아보는 말이라 바꾸지 않는다. */
function PickerFoot({ disabled, count, unit, onApply }: { disabled: boolean; count: number; unit: string; onApply: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-slate-200 px-5 py-3 sm:px-6">
      <p className="flex-1 text-body-2 font-semibold text-slate-700">{count > 0 ? `${count}${unit} 골랐어요` : "골라 주세요"}</p>
      <button
        type="button"
        data-guest-gated
        disabled={disabled}
        onClick={onApply}
        className="h-12 rounded-xl bg-baro-blue px-8 text-body-1 font-bold text-white disabled:bg-slate-300"
      >
        적용하기
      </button>
    </div>
  );
}

/**
 * 급여 고르기 판. 받는 방식(월급 · 시급 · 일급 · 연봉)을 먼저 고르고 그 안에서 최소 금액을 고른다 - lib/jobs/salary-filter.
 * 방식을 바꾸면 금액은 "상관없음"으로 돌아간다(시급 1만 원 칸이 월급에 남으면 안 된다).
 * 칸 모양 · 고른 표시(체크)는 지역 · 직종 판과 같게 - 판을 바꿔 열어도 한 벌로 읽힌다.
 * 지금 공고는 모두 금액이 적혀 있어(협의 · 내규 0건) "금액 없는 공고 포함" 같은 선택지는 두지 않는다.
 */
function SalaryPicker({
  unit,
  atLeast,
  onClose,
  onApply,
}: {
  unit?: SalaryFilterUnit;
  atLeast?: number;
  onClose: () => void;
  onApply: (unit: SalaryFilterUnit, atLeast?: number) => void;
}) {
  const [draftUnit, setDraftUnit] = useState<SalaryFilterUnit>(unit ?? "monthly");
  const [draftAtLeast, setDraftAtLeast] = useState<number | undefined>(unit ? atLeast : undefined);

  return (
    <>
      <PickerHead title="얼마를 받고 싶으세요?" note="받는 방식을 먼저 고르고, 최소 금액을 골라 주세요." onClose={onClose} />
      <div className="min-h-0 overflow-y-auto px-5 pb-4 sm:px-6">
        <p className="mb-2 text-body-3 font-bold text-slate-700">받는 방식</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {SALARY_FILTER_UNITS.map((u) => {
            const on = u.key === draftUnit;
            return (
              <button
                key={u.key}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  if (on) return;
                  setDraftUnit(u.key);
                  setDraftAtLeast(undefined);
                }}
                className={cn(choiceClass, "whitespace-nowrap", on ? choiceOnClass : choiceOffClass)}
              >
                {u.label}
              </button>
            );
          })}
        </div>

        <p className="mt-5 mb-2 text-body-3 font-bold text-slate-700">최소 금액</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {[undefined, ...SALARY_FILTER_AMOUNTS[draftUnit].map((a) => a.value)].map((value) => {
            const on = value === draftAtLeast;
            const label = SALARY_FILTER_AMOUNTS[draftUnit].find((a) => a.value === value)?.label;
            return (
              <button
                key={value ?? "any"}
                type="button"
                aria-pressed={on}
                onClick={() => setDraftAtLeast(value)}
                className={cn(choiceClass, "whitespace-nowrap", on ? choiceOnClass : choiceOffClass)}
              >
                {label ? `${label} 이상` : "상관없음"}
              </button>
            );
          })}
        </div>
      </div>
      {/* "적용하기"는 비로그인 문지기(GuestGate)가 알아보는 말이라 바꾸지 않는다(PickerFoot 와 같은 단추). */}
      <div className="flex shrink-0 items-center gap-3 border-t border-slate-200 px-5 py-3 sm:px-6">
        <p className="flex-1 text-body-2 font-semibold break-keep text-slate-700">{salaryFilterLabel(draftUnit, draftAtLeast)}</p>
        <button
          type="button"
          data-guest-gated
          onClick={() => onApply(draftUnit, draftAtLeast)}
          className="h-12 rounded-xl bg-baro-blue px-8 text-body-1 font-bold text-white"
        >
          적용하기
        </button>
      </div>
    </>
  );
}
