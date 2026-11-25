"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { daysLeft, deadlineLabel, shortLocation } from "@/features/home-draft/draft-job-card";
import type { FeaturedJobsTab } from "@/features/home-draft/featured-jobs-panel";
import { JobBookmarkButton } from "@/features/jobs/job-bookmark-button";
import { splitSalary } from "@/lib/salary";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";

/**
 * 공고 6장을 가로 한 줄로 두고 왼쪽으로 천천히 흐르게 한다.
 * 같은 6장을 한 번 더 이어 붙여 translateX(-50%) 로 돌리면 이음매 없이 반복된다(globals.css 의 marquee).
 * 마우스를 올리거나 키보드로 들어오면 멈춘다 - 움직이는 카드는 누르기 어려워서.
 * 휴대폰(sm 미만)과 움직임 줄이기 설정에서는 흐르지 않고 손으로 미는 가로 목록이 된다 - 휴대폰은 마우스를 올려 멈출 수가 없어서.
 */
const CARD_COUNT = 6;

/**
 * /draft3 공고 구역. 탭은 /draft2 의 밑줄 탭, 공고는 가로로 흐르는 카드 한 줄(아래 SimpleJobCard).
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

      <div className="scrollbar-hidden -mx-4.5 mt-6 overflow-x-auto sm:mx-0 sm:[mask-image:linear-gradient(to_right,transparent,black_3%,black_97%,transparent)] sm:motion-safe:overflow-hidden">
        <ul
          key={active.key}
          aria-label={`${active.label} 공고`}
          className="flex w-max pr-4.5 pl-1.5 focus-within:[animation-play-state:paused] hover:[animation-play-state:paused] sm:px-0 sm:motion-safe:animate-[marquee_50s_linear_infinite]"
        >
          {[0, 1].map((copy) =>
            active.jobs.slice(0, CARD_COUNT).map((job) => (
              <li
                key={`${copy}-${job.id}`}
                aria-hidden={copy === 1 || undefined}
                inert={copy === 1 || undefined}
                className={cn("w-[17rem] shrink-0 pl-3 sm:w-[20rem] sm:pl-4", copy === 1 && "hidden sm:motion-safe:block")}
              >
                <SimpleJobCard job={job} isAuthenticated={isAuthenticated} isBookmarked={bookmarkedIds.includes(job.id)} />
              </li>
            )),
          )}
        </ul>
      </div>

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

/**
 * /draft3 전용 공고 카드. 공용 JobCard 에서 태그 줄 · 동전 그림을 덜어 네 줄로 줄였다:
 * 제목(늘 두 줄 높이) / 회사 · 지역 / 급여 / 마감 · 찜.
 * 넓은 화면은 제목 칸 높이를 두 줄로 고정해, 제목이 한 줄인 카드와 두 줄인 카드가 섞여도 아래 줄들이 가로로 맞는다(휴대폰은 한 줄에 한 장이라 고정하지 않는다).
 * 테두리 없이 회색 바탕 위 흰 카드로만 구분한다.
 */
function SimpleJobCard({ job, isAuthenticated, isBookmarked }: { job: Job; isAuthenticated: boolean; isBookmarked: boolean }) {
  const salary = splitSalary(job);
  const location = shortLocation(job);
  const left = daysLeft(job);
  const urgent = left !== null && left >= 0 && left <= 7;
  return (
    <div className="relative h-full">
      <Link href={`/jobs/${job.id}`} className="flex h-full flex-col rounded-xl bg-white p-5 sm:p-6">
        <h3 className="line-clamp-2 text-body-1 sm:min-h-[2.8em] leading-[1.4] font-semibold break-keep text-slate-800">{job.title}</h3>
        <p className="mt-2 flex min-w-0 items-center gap-1.5 text-body-3 font-medium text-slate-600">
          <span className="truncate">{job.companyName}</span>
          {location && <span aria-hidden className="size-0.5 shrink-0 rounded-full bg-slate-400" />}
          {location && <span className="shrink-0 whitespace-nowrap">{location}</span>}
        </p>
        <p className="mt-4 truncate text-body-1 font-bold text-slate-900">
          {salary.typeLabel && <span className="mr-1.5 text-body-3 font-medium text-slate-600">{salary.typeLabel}</span>}
          {salary.amount}
        </p>
        <p className={cn("mt-auto pt-4 text-body-3", urgent ? "font-bold text-[#D04040]" : "font-medium text-slate-600")}>
          {deadlineLabel(left)}
        </p>
      </Link>
      <JobBookmarkButton
        jobId={job.id}
        jobCategory={job.jobCategory}
        isAuthenticated={isAuthenticated}
        initialBookmarked={isBookmarked}
        className="absolute right-4 bottom-4"
      />
    </div>
  );
}
