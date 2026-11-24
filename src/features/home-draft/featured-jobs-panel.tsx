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
    <section className="flex h-full flex-col rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-title-3 font-bold tracking-tight text-slate-900 sm:text-title-2">지금 눈여겨볼 공고</h2>
        {/* 고른 탭의 목록으로 간다. 탭을 바꾸면 글자도 함께 바뀐다. */}
        {active && (
          <Link
            href={active.href}
            className="inline-flex items-center gap-0.5 text-body-2 font-semibold text-slate-700 hover:text-slate-900"
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
                    // 흰 알약에 테두리 색으로 가른다. 고른 탭은 파란 테두리·글자.
                    "flex shrink-0 items-center gap-1.5 rounded-full border bg-white px-4 py-2 text-body-2 whitespace-nowrap transition-colors",
                    selected
                      ? "border-brand-blue-600 font-semibold text-brand-blue-600"
                      : "border-slate-300 font-medium text-slate-700 hover:border-slate-400",
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
 * 사람인 추천공고처럼 세 장씩 보여 주고 좌우 화살표로 넘긴다.
 * 저절로 넘어가지 않는다. 휴대폰은 손가락으로 밀어 보고 화살표는 넓은 화면에만 둔다.
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
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(jobs.length <= 3);

  /* 끝에 닿았는지는 스크롤 위치로 잰다. 소수점 오차가 있어 1px 여유를 둔다. */
  const syncEdges = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };

  useEffect(() => {
    syncEdges();
    window.addEventListener("resize", syncEdges);
    return () => window.removeEventListener("resize", syncEdges);
  }, []);

  /* 한 번에 보이는 폭(세 장)만큼 넘긴다. */
  const page = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    if (!card) return;
    // 카드 세 장 + 사이 간격(16px) 세 개. 그만큼 밀어야 다음 세 장의 첫 장이 왼쪽 끝에 맞는다.
    el.scrollBy({ left: dir * (card.offsetWidth + 16) * 3, behavior: "smooth" });
  };

  const arrowClass =
    "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-colors hover:bg-slate-50 sm:flex";

  return (
    <div className="relative mt-4 flex-1">
      <div
        ref={scrollerRef}
        onScroll={syncEdges}
        // 넓은 화면은 좌우를 4px씩 넓혀 둔다. 넘긴 뒤 카드가 칸 끝에 딱 붙으면
        // 스크롤 상자가 카드 테두리를 잘라 왼쪽 선이 안 보였다.
        className="scrollbar-hidden -mx-5 flex h-full snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 sm:-mx-1 sm:scroll-px-1 sm:gap-4 sm:px-1"
      >
        {jobs.map((job) => (
          // 넓은 화면은 세 장이 칸을 꼭 채운다: (전체 - 사이 간격 두 개) / 3.
          <div key={job.id} className="w-[78%] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)]">
            <DraftJobCard job={job} isAuthenticated={isAuthenticated} isBookmarked={bookmarked.has(job.id)} />
          </div>
        ))}
      </div>

      {!atStart && (
        <button type="button" aria-label="이전 공고" onClick={() => page(-1)} className={cn(arrowClass, "-left-5")}>
          <ChevronLeft className="size-5" />
        </button>
      )}
      {!atEnd && (
        <button type="button" aria-label="다음 공고" onClick={() => page(1)} className={cn(arrowClass, "-right-5")}>
          <ChevronRight className="size-5" />
        </button>
      )}
    </div>
  );
}
