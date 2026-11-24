"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
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

          {/* 휴대폰은 옆으로 넘겨 보고, 넓은 화면은 세 장을 나란히 둔다. */}
          <div
            role="tabpanel"
            className="scrollbar-hidden -mx-5 mt-4 flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0"
          >
            {active.jobs.slice(0, 3).map((job) => (
              <div key={job.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
                <DraftJobCard job={job} isAuthenticated={isAuthenticated} isBookmarked={bookmarked.has(job.id)} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-6 text-body-2 text-slate-600">공고를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>
      )}
    </section>
  );
}
