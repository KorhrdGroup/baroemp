"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { FeaturedJobsTab } from "@/features/home-draft/featured-jobs-panel";
import { JobCard } from "@/features/jobs/job-card";
import { cn } from "@/lib/utils";

/** 넓은 화면은 3장 × 2줄, 휴대폰은 4장까지만(세로로 길어지지 않게). */
const CARD_COUNT = 6;
const MOBILE_COUNT = 4;

/**
 * /draft3 공고 구역. 탭은 /draft2 의 밑줄 탭, 공고는 /draft 의 카드.
 * 공고는 급여 · 지역 · 마감을 견줘 보는 것이라 표보다 카드가 한눈에 들어온다.
 */
export function JobCardTabs({
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

  if (!active) {
    return <p className="py-10 text-center text-body-2 font-medium text-slate-600">공고를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>;
  }

  return (
    <div>
      <div role="tablist" className="scrollbar-hidden -mx-4.5 flex overflow-x-auto border-b border-slate-300 px-4.5 sm:mx-0 sm:px-0">
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
                "-mb-px shrink-0 border-b-[3px] px-3 py-3 text-body-1 whitespace-nowrap sm:px-4",
                selected ? "border-atomic-blue-600 font-bold text-slate-900" : "border-transparent font-medium text-slate-600",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <ul aria-label={`${active.label} 공고`} className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {active.jobs.slice(0, CARD_COUNT).map((job, i) => (
          <li key={job.id} className={i >= MOBILE_COUNT ? "hidden sm:block" : undefined}>
            <JobCard job={job} isAuthenticated={isAuthenticated} isBookmarked={bookmarkedIds.includes(job.id)} />
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-center">
        <Link
          href={active.href}
          className="inline-flex h-12 items-center gap-1 rounded-lg border border-slate-300 bg-white px-6 text-body-2 font-semibold text-slate-800"
        >
          {active.label} 공고 더 보기
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
