"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";
import { DraftJobCard } from "./draft-job-card";

export interface FeaturedJobsTab {
  key: string;
  label: string;
  /** 탭 글자 앞의 그림 글자. */
  emoji: string;
  /** "전체 보기"가 가는 곳. 같은 조건의 일자리찾기 목록. */
  href: string;
  jobs: Job[];
}

/**
 * 첫 줄 가운데의 공고 판 (사람인의 "회원님을 위한 추천공고" 자리).
 * 탭마다 공고를 서버에서 미리 받아 두고 누르면 바로 바꿔 보여준다 - 탭을 누를 때마다
 * 기다리게 하면 중장년 이용자는 눌린 줄 모르고 다시 누른다.
 * 저절로 넘어가는 슬라이드는 두지 않는다.
 */
export function FeaturedJobsPanel({
  tabs,
  isAuthenticated,
  bookmarkedIds,
}: {
  tabs: FeaturedJobsTab[];
  isAuthenticated: boolean;
  bookmarkedIds: string[];
}) {
  const visibleTabs = tabs.filter((t) => t.jobs.length > 0);
  const [activeKey, setActiveKey] = useState(visibleTabs[0]?.key);
  const active = visibleTabs.find((t) => t.key === activeKey) ?? visibleTabs[0];
  const bookmarked = new Set(bookmarkedIds);

  return (
    <section className="flex h-full flex-col rounded-2xl bg-gov-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-title-3 font-bold tracking-tight text-slate-900 sm:text-title-2">지금 눈여겨볼 공고</h2>
        {/* 고른 탭의 목록으로 간다. 탭을 바꾸면 글자도 함께 바뀐다. */}
        {active && (
          <Link
            href={active.href}
            className="inline-flex items-center gap-0.5 text-body-2 font-semibold text-slate-700"
          >
            {active.label} 더보기
            <ChevronRight className="size-4" />
          </Link>
        )}
      </div>

      {visibleTabs.length > 0 && active ? (
        <>
          <div role="tablist" className="scrollbar-hidden -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            {visibleTabs.map((tab) => {
              const selected = tab.key === active.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveKey(tab.key)}
                  className={cn(
                    // 회색 판 위라 테두리 없이 면으로 가른다. 고른 탭은 파란 면·흰 글자, 나머지는 흰 알약.
                    "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-body-2 whitespace-nowrap",
                    selected
                      ? "bg-brand-blue-600 font-semibold text-white"
                      : "bg-white font-medium text-slate-700",
                  )}
                >
                  <span aria-hidden>{tab.emoji}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 탭을 바꾸면 처음 칸부터 다시 보이도록 key 로 새로 그린다. */}
          <JobsCarousel
            key={active.key}
            jobs={active.jobs}
            isAuthenticated={isAuthenticated}
            bookmarked={bookmarked}
          />
        </>
      ) : (
        <p className="mt-6 text-body-2 text-slate-600">공고를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>
      )}
    </section>
  );
}

/**
 * 사람인 추천공고처럼 세 장씩 보여 주고 넘긴다. 저절로 넘어가지 않는다.
 * 넓은 화면은 카드 아래에 "‹ 1 / 3 ›"를 둬 지금 몇 번째 묶음인지 보여 주고 거기서 넘긴다 -
 * 카드 양옆에 화살표를 걸치면 카드 글자를 가렸고, 판 아래에 남던 빈칸도 이 줄이 채운다.
 * 휴대폰은 손가락으로 밀어 보고 이 줄은 두지 않는다.
 */
function JobsCarousel({
  jobs,
  isAuthenticated,
  bookmarked,
}: {
  jobs: Job[];
  isAuthenticated: boolean;
  bookmarked: Set<string>;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pageCount = Math.ceil(jobs.length / 3);
  const [pageIndex, setPageIndex] = useState(0);

  /* 한 묶음(카드 세 장 + 사이 간격 16px 세 개)의 폭. */
  const pageWidth = () => {
    const card = scrollerRef.current?.firstElementChild as HTMLElement | null;
    return card ? (card.offsetWidth + 16) * 3 : 0;
  };

  /*
    지금 묶음은 스크롤 위치로 잰다. 끝에 닿으면 마지막 묶음으로 친다 -
    공고 수가 3의 배수가 아니면 마지막 묶음은 한 묶음 폭만큼 다 밀리지 않는다. 소수점 오차로 1px 여유를 둔다.
  */
  const syncPage = () => {
    const el = scrollerRef.current;
    const width = pageWidth();
    if (!el || !width) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    setPageIndex(atEnd ? pageCount - 1 : Math.round(el.scrollLeft / width));
  };

  useEffect(() => {
    window.addEventListener("resize", syncPage);
    return () => window.removeEventListener("resize", syncPage);
  });

  /*
    가려는 묶음의 자리로 곧장 보낸다. 지금 자리에서 한 묶음만큼 미는 방식(scrollBy)은
    앞 넘김이 막 끝난 직후 누르면 가끔 먹지 않았다.
  */
  const page = (dir: 1 | -1) => {
    const target = Math.min(Math.max(pageIndex + dir, 0), pageCount - 1);
    scrollerRef.current?.scrollTo({ left: target * pageWidth(), behavior: "smooth" });
  };

  const arrowClass =
    "flex size-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 disabled:border-slate-200 disabled:text-slate-300";

  return (
    <div className="mt-4">
      <div
        ref={scrollerRef}
        onScroll={syncPage}
        // 넓은 화면은 좌우를 4px씩 넓혀 둔다. 넘긴 뒤 카드가 칸 끝에 딱 붙으면
        // 스크롤 상자가 카드 테두리를 잘라 왼쪽 선이 안 보였다.
        className="scrollbar-hidden -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 sm:-mx-1 sm:scroll-px-1 sm:gap-4 sm:px-1"
      >
        {jobs.map((job) => (
          // 넓은 화면은 세 장이 칸을 꼭 채운다: (전체 - 사이 간격 두 개) / 3.
          <div key={job.id} className="w-[78%] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)]">
            <DraftJobCard job={job} isAuthenticated={isAuthenticated} isBookmarked={bookmarked.has(job.id)} borderless />
          </div>
        ))}
      </div>

      {pageCount > 1 && (
        <div className="mt-4 hidden items-center justify-center gap-3 sm:flex">
          <button type="button" aria-label="이전 공고" disabled={pageIndex === 0} onClick={() => page(-1)} className={arrowClass}>
            <ChevronLeft className="size-5" />
          </button>
          <p className="min-w-12 text-center text-body-3 font-medium text-slate-600" aria-live="polite">
            <span className="sr-only">공고 묶음 </span>
            <span className="font-bold text-slate-900">{pageIndex + 1}</span> / {pageCount}
          </p>
          <button
            type="button"
            aria-label="다음 공고"
            disabled={pageIndex === pageCount - 1}
            onClick={() => page(1)}
            className={arrowClass}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
