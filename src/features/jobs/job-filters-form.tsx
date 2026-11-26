"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterPillClass, filterPillOffClass } from "@/lib/ui-classes";
import { REGION_LABELS } from "@/lib/labels";
import { SIGUNGU_BY_REGION } from "@/lib/regions/sigungu-list";
import type { Region } from "@/types";
import { JOB_CATEGORY_GROUPS, jobCategoryLabel as labelOfJobCategory } from "@/lib/jobs/job-category-groups";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import { trackJobFilterChangedAction, trackJobSearchAction } from "@/features/jobs/job-actions";
import { PageHead } from "@/components/layout/page-head";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { JobSortOrder } from "@/types";

/** 한 번에 고를 수 있는 시·군·구 수. */
const MAX_SIGUNGU = 5;

const SORT_OPTIONS: { value: JobSortOrder; label: string }[] = [
  { value: "recommended", label: "추천순" },
  { value: "latest", label: "최신순" },
  { value: "deadline", label: "마감임박순" },
  { value: "salary_desc", label: "급여높은순" },
];

/* 조건 줄의 알약 단추. 걸린 조건만 남색으로 채워, 무엇이 걸려 있는지 한눈에 보이게 한다. */
const pillClass = "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-body-2 whitespace-nowrap";
const pillOnClass = "bg-baro-navy font-bold text-white";
const pillOffClass = "bg-white font-semibold text-slate-800 ring-1 ring-slate-300 ring-inset";

/* 고르기 창 안의 칸. 고른 칸은 옅은 파랑 바탕 + 파란 테두리 + 체크. */
const choiceClass =
  "flex h-14 items-center justify-center gap-1.5 rounded-xl px-3 text-body-2 break-keep disabled:opacity-40";
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
  sort?: JobSortOrder;
}

/**
 * 일자리찾기 화면의 틀: 머리(제목 · 검색창 · 조건 줄) + 회색 바탕의 목록.
 *
 * 왼쪽에 조건 판을 늘 펼쳐 두던 것을 걷고, 검색창 아래 한 줄로 모았다.
 * 조건 판이 목록 폭을 1/4 가까이 차지해 카드가 두 장씩만 놓였고, 화면에 고를 것이 너무 많아 보였다.
 * 지역 · 직종은 누르면 큰 고르기 창이 뜨고, 고르면 바로 목록에 걸린다("전국" · "○○ 전체" · "직종 전체"는 누르는 즉시).
 * 신입 가능 · 7일 안에 마감은 누를 때마다 바로 켜고 끈다.
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
  const [picker, setPicker] = useState<"region" | "job" | null>(null);
  const [keyword, setKeyword] = useState(initial.keyword ?? "");
  const [region, setRegion] = useState(initial.region ?? "all");
  const [sigungus, setSigungus] = useState<string[]>(initial.regionSigungus ?? []);
  const [jobCategories, setJobCategories] = useState<string[]>(initial.jobCategories ?? []);
  const [beginnerOnly, setBeginnerOnly] = useState(Boolean(initial.isBeginnerFriendly));
  const [closingSoon, setClosingSoon] = useState(Boolean(initial.closingSoon));
  const [sort, setSort] = useState<JobSortOrder>(initial.sort ?? "recommended");

  const regionActive = region !== "all";
  const jobActive = jobCategories.length > 0;
  const anyActive = regionActive || jobActive || beginnerOnly || closingSoon;
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

  /* 조건을 걸어 목록을 다시 부른다. 알약 · 고르기 창 · 정렬이 모두 여기로 온다. */
  const submit = async (overrides: Partial<JobFiltersValue> = {}) => {
    setSortOpen(false);
    setPicker(null);
    const { next, params } = buildParams(overrides);
    setRegion(next.region ?? "all");
    setSigungus(next.regionSigungus ?? []);
    setJobCategories(next.jobCategories ?? []);
    setBeginnerOnly(Boolean(next.isBeginnerFriendly));
    setClosingSoon(Boolean(next.closingSoon));
    const anonymousId = getOrCreateAnonymousId();
    if (Object.keys(overrides).length > 0) {
      await trackJobFilterChangedAction({ anonymousId, filter: next as Record<string, unknown> });
    } else {
      await trackJobSearchAction({ anonymousId, keyword: next.keyword, filter: next as Record<string, unknown>, resultCount: -1 });
    }
    router.push(`/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const head = (
    <div className="mt-5 sm:mt-6">
      {/* 검색어. 지역·직종은 아래 조건 줄이 맡아 검색바는 글자만 받는다. 흰 머리 위라 옅은 테두리로 칸을 보인다. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex h-14 items-center rounded-xl bg-white ring-1 ring-[#DDE3EC] ring-inset sm:h-16"
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
        <button
          type="submit"
          className="m-1.5 flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand-blue-600 px-6 text-body-2 font-semibold text-white sm:h-[52px] sm:px-8"
        >
          <Search className="size-4" strokeWidth={2.2} />
          검색
        </button>
      </form>

      {/*
        조건 줄. 좁은 화면에서는 옆으로 밀어 본다(줄을 바꾸면 머리가 길어진다).
        고르기 창을 여는 것은 둘러보기라 비로그인에게도 열어 두고, 목록을 다시 부르는 단추만 문지기(data-guest-gated)에 걸린다.
      */}
      <div className="-mx-4.5 mt-3 flex items-center gap-2 overflow-x-auto px-4.5 py-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        <button type="button" onClick={() => setPicker("region")} className={cn(pillClass, regionActive ? pillOnClass : pillOffClass)}>
          {regionPillLabel}
          <ChevronDown aria-hidden className="size-4" strokeWidth={2.2} />
        </button>
        <button type="button" onClick={() => setPicker("job")} className={cn(pillClass, jobActive ? pillOnClass : pillOffClass)}>
          {jobPillLabel}
          <ChevronDown aria-hidden className="size-4" strokeWidth={2.2} />
        </button>
        <button
          type="button"
          data-guest-gated
          aria-pressed={beginnerOnly}
          onClick={() => void submit({ isBeginnerFriendly: !beginnerOnly || undefined })}
          className={cn(pillClass, beginnerOnly ? pillOnClass : pillOffClass)}
        >
          {beginnerOnly && <Check aria-hidden className="size-4" strokeWidth={2.6} />}
          신입 가능
        </button>
        <button
          type="button"
          data-guest-gated
          aria-pressed={closingSoon}
          onClick={() => void submit({ closingSoon: !closingSoon || undefined })}
          className={cn(pillClass, closingSoon ? pillOnClass : pillOffClass)}
        >
          {closingSoon && <Check aria-hidden className="size-4" strokeWidth={2.6} />}
          7일 안에 마감
        </button>
        {anyActive && (
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
              })
            }
            className="h-11 shrink-0 px-2 text-body-3 font-semibold whitespace-nowrap text-slate-700 underline underline-offset-4"
          >
            조건 초기화
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <PageHead crumbs={[{ label: "일자리 찾기" }]} title="일자리 찾기" footer={head} />

      {/* 흰 머리 아래 회색 바탕에 흰 판 · 흰 카드(모서리 20px, 테두리 없음). */}
      <div className="bg-baro-page">
        <div className="mx-auto max-w-7xl px-4.5 pt-8 pb-16 lg:px-8">
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

          {children}
        </div>
      </div>

      <Dialog open={picker !== null} onOpenChange={(open) => !open && setPicker(null)}>
        <DialogContent className="draft3-theme flex max-h-[88vh] flex-col gap-0 overflow-hidden rounded-card p-0 sm:max-w-2xl">
          {picker === "region" && (
            <RegionPicker
              region={region}
              sigungus={sigungus}
              onApply={(r, s) =>
                void submit({ region: r === "all" ? undefined : r, regionSigungus: r === "all" || s.length === 0 ? undefined : s })
              }
            />
          )}
          {picker === "job" && (
            <JobPicker
              selected={jobCategories}
              nameOf={nameOfJob}
              onApply={(keys) => void submit({ jobCategories: keys.length > 0 ? keys : undefined })}
            />
          )}
        </DialogContent>
      </Dialog>
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
}: {
  region: string;
  sigungus: string[];
  onApply: (region: string, sigungus: string[]) => void;
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
        <PickerHead title="어느 지역 일자리를 볼까요?" />
        <div className="grid min-h-0 grid-cols-3 gap-2 overflow-y-auto px-6 pb-6 sm:grid-cols-4 sm:px-7 sm:pb-7">
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
        note={`시·군·구는 ${MAX_SIGUNGU}곳까지 고를 수 있어요.`}
      />
      <div className="grid min-h-0 grid-cols-2 gap-2 overflow-y-auto px-6 pb-4 sm:grid-cols-4 sm:px-7">
        <button
          type="button"
          data-guest-gated
          onClick={() => onApply(sido, [])}
          className={cn(choiceClass, "col-span-2", picked.length === 0 ? choiceOnClass : choiceOffClass)}
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
}: {
  selected: string[];
  nameOf: (key: string) => string;
  onApply: (keys: string[]) => void;
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
      <PickerHead title="어떤 일을 찾으세요?" note="여러 개를 함께 고를 수 있어요." />
      <div className="grid min-h-0 grid-cols-2 gap-2 overflow-y-auto px-6 pb-4 sm:grid-cols-3 sm:px-7">
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

function PickerHead({ title, back, note }: { title: string; back?: React.ReactNode; note?: string }) {
  return (
    <div className="shrink-0 px-6 pt-6 pb-4 sm:px-7 sm:pt-7">
      {back}
      <DialogTitle className="pr-8 text-title-2 font-extrabold break-keep text-slate-900">{title}</DialogTitle>
      {note && <p className="mt-1 text-body-3 font-medium break-keep text-slate-600">{note}</p>}
    </div>
  );
}

/** 고르기 창 아래 "적용하기". 이 말은 비로그인 문지기(GuestGate)가 알아보는 말이라 바꾸지 않는다. */
function PickerFoot({ disabled, count, unit, onApply }: { disabled: boolean; count: number; unit: string; onApply: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-slate-200 px-6 py-4 sm:px-7">
      <p className="flex-1 text-body-2 font-semibold text-slate-700">{count > 0 ? `${count}${unit} 골랐어요` : "골라 주세요"}</p>
      <button
        type="button"
        data-guest-gated
        disabled={disabled}
        onClick={onApply}
        className="h-14 rounded-xl bg-baro-blue px-8 text-body-1 font-bold text-white disabled:bg-slate-300"
      >
        적용하기
      </button>
    </div>
  );
}
