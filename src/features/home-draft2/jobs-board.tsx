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
 * 카드를 넘겨 보는 /draft 와 달리 아홉 건이 한눈에 보인다.
 * 넓은 화면은 표(공고명 · 회사 · 지역 · 급여 · 마감), 휴대폰은 줄마다 제목 아래 나머지를 한 줄로 접는다.
 */
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

      <table className="w-full table-fixed text-left">
        <caption className="sr-only">{active.label} 공고</caption>
        <thead className="hidden border-b border-slate-300 bg-slate-50 lg:table-header-group">
          <tr className="text-body-3 font-semibold text-slate-700">
            <th scope="col" className="px-4 py-3">공고명</th>
            <th scope="col" className="w-[18%] px-3 py-3">회사</th>
            <th scope="col" className="w-[15%] px-3 py-3">지역</th>
            <th scope="col" className="w-[17%] px-3 py-3">급여</th>
            <th scope="col" className="w-[11%] px-3 py-3 text-center">마감</th>
          </tr>
        </thead>
        <tbody>
          {active.jobs.map((job) => {
            const left = daysLeft(job);
            const urgent = left !== null && left >= 0 && left <= 7;
            const salary = splitSalary(job);
            const location = shortLocation(job);
            const deadline = (
              <span className={cn("whitespace-nowrap", urgent ? "font-bold text-[#D04040]" : "font-medium text-slate-600")}>
                {deadlineLabel(left)}
              </span>
            );
            return (
              <tr key={job.id} className="block border-b border-border py-3.5 lg:table-row lg:py-0">
                <td className="block lg:table-cell lg:px-4 lg:py-4">
                  <Link href={`/jobs/${job.id}`} className="line-clamp-1 text-body-1 font-semibold text-slate-900">
                    {job.title}
                  </Link>
                  {/* 휴대폰: 제목 아래 회사 · 지역 · 급여 · 마감을 한 줄로. */}
                  <p className="mt-1 flex min-w-0 items-center gap-1.5 text-body-3 text-slate-600 lg:hidden">
                    <span className="truncate">{job.companyName}</span>
                    {location && <Dot />}
                    {location && <span className="shrink-0">{location}</span>}
                    <Dot />
                    {deadline}
                  </p>
                </td>
                <td className="hidden truncate px-3 py-4 text-body-3 font-medium text-slate-700 lg:table-cell">{job.companyName}</td>
                <td className="hidden truncate px-3 py-4 text-body-3 font-medium text-slate-700 lg:table-cell">{location}</td>
                <td className="hidden truncate px-3 py-4 text-body-3 font-semibold text-slate-900 lg:table-cell">
                  {salary.typeLabel && <span className="mr-1 font-medium text-slate-600">{salary.typeLabel}</span>}
                  {salary.amount}
                </td>
                <td className="hidden px-3 py-4 text-center text-body-3 lg:table-cell">{deadline}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

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
