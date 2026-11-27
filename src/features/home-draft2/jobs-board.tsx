"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { daysLeft, deadlineLabel, shortLocation } from "@/features/home-draft/draft-job-card";
import type { FeaturedJobsTab } from "@/features/home-draft/featured-jobs-panel";
import { splitSalary } from "@/lib/salary";
import { cn } from "@/lib/utils";

/**
 * 공고 게시판. 고용24 채용정보처럼 밑줄 탭 아래에 한 줄에 한 공고씩 늘어놓는다 -
 * 카드를 넘겨 보는 /draft 와 달리 여러 건이 한눈에 보인다.
 * 줄마다 공고명 아래 지역 · 급여 한 줄만 둔다.
 */
/** 게시판에 보여 줄 줄 수. 탭마다 아홉 건을 받지만 벤토 칸 높이에 맞춰 줄인다. */
const BOARD_ROWS = 6;

export function JobsBoard({ tabs }: { tabs: FeaturedJobsTab[] }) {
  const visibleTabs = tabs.filter((t) => t.jobs.length > 0);
  const [activeKey, setActiveKey] = useState(visibleTabs[0]?.key);
  const active = visibleTabs.find((t) => t.key === activeKey) ?? visibleTabs[0];

  if (!active) {
    return <p className="border-y border-border py-10 text-center text-body-2 text-slate-600">공고를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>;
  }

  return (
    <div>
      {/* 밑줄 탭: 고른 탭만 진한 글자 + 파란 밑줄. 탭 줄 전체 아래에 회색 선을 깔아 표와 이어 보이게 한다. */}
      <div role="tablist" className="scrollbar-hidden -mx-4.5 flex overflow-x-auto border-b border-border px-4.5 sm:mx-0 sm:px-0">
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

      {/*
        줄마다 두 덩어리만: 공고명 / 지역 · 급여. 회사 이름은 공고를 열면 보이고, 중장년에게는 어디서 일하는지가 먼저다.
        마감은 "마감 임박" 탭에서는 빼고(탭 이름이 이미 말해 준다), 다른 탭에서는 7일 이내일 때만 오른쪽에 붙인다.
        글자 크기는 그대로 두고 글의 양을 줄인다 - 작게 줄이면 읽기만 어려워진다.
        검정(slate-900)은 탭 이름에만 두고, 공고명은 한 톤 옅게(800), 급여는 700 - 줄마다 진한 글이 두 덩어리씩 쌓여 무거웠다.
      */}
      <ul aria-label={`${active.label} 공고`}>
        {active.jobs.slice(0, BOARD_ROWS).map((job) => {
          const left = daysLeft(job);
          const showDeadline = active.key !== "closing" && left !== null && left >= 0 && left <= 7;
          const salary = splitSalary(job);
          const location = shortLocation(job);
          return (
            <li key={job.id} className="flex items-center justify-between gap-4 border-b border-border py-4 sm:px-2">
              <div className="min-w-0">
                <Link href={`/jobs/${job.id}`} className="line-clamp-1 text-body-1 font-semibold text-slate-800">
                  {job.title}
                </Link>
                <p className="mt-1 flex min-w-0 items-center gap-1.5 text-body-2 font-medium text-slate-600">
                  {location && <span className="shrink-0">{location}</span>}
                  {location && <Dot />}
                  <span className="truncate font-semibold text-slate-700">
                    {salary.typeLabel ? `${salary.typeLabel} ` : ""}
                    {salary.amount}
                  </span>
                </p>
              </div>
              {showDeadline && (
                <span className="shrink-0 text-body-3 font-bold whitespace-nowrap text-[#D04040]">{deadlineLabel(left)}</span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex justify-end">
        <Link href={active.href} className="inline-flex items-center gap-0.5 text-body-2 font-semibold text-slate-700">
          {active.label} 공고 전체 보기
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function Dot() {
  return <span aria-hidden className="size-0.5 shrink-0 rounded-full bg-slate-400" />;
}
