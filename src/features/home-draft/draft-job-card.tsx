import Link from "next/link";
import { JobBookmarkButton } from "@/features/jobs/job-bookmark-button";
import { labelRegion } from "@/lib/labels";
import { splitSalary } from "@/lib/salary";
import type { Job } from "@/types";

function deadlineLabel(job: Job): string {
  if (!job.applyDeadline) return "상시채용";
  const daysLeft = Math.ceil((new Date(job.applyDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "마감";
  return daysLeft === 0 ? "오늘 마감" : `D-${daysLeft}`;
}

/**
 * 시안의 공고 카드. 한눈에 읽히도록 제목 · 회사와 지역 · 급여 · 남은 날만 둔다.
 * 배지와 메타 줄은 목록(일자리찾기)에서 보면 된다.
 */
export function DraftJobCard({
  job,
  isAuthenticated,
  isBookmarked,
}: {
  job: Job;
  isAuthenticated: boolean;
  isBookmarked: boolean;
}) {
  const salary = splitSalary(job);
  const location = [labelRegion(job.region), job.regionSigungu].filter(Boolean).join(" ");
  return (
    <div className="relative h-full">
      <Link
        href={`/jobs/${job.id}`}
        className="group flex h-full min-h-44 flex-col rounded-xl border border-border bg-white p-5 transition-colors hover:border-slate-300"
      >
        <h3 className="line-clamp-2 pr-9 text-body-1 leading-[1.4] font-semibold break-keep text-slate-900 group-hover:underline">
          {job.title}
        </h3>
        <p className="mt-2 truncate text-label-1 text-slate-500">
          {job.companyName}
          {location && <span className="before:mx-1.5 before:content-['·']">{location}</span>}
        </p>
        <p className="mt-auto flex items-baseline justify-between gap-2 pt-4">
          <span className="truncate text-body-2 font-semibold text-slate-900">
            {salary.typeLabel && <span className="mr-1 font-medium text-slate-500">{salary.typeLabel}</span>}
            {salary.amount}
          </span>
          <span className="shrink-0 text-label-1 text-slate-500">{deadlineLabel(job)}</span>
        </p>
      </Link>
      <JobBookmarkButton
        jobId={job.id}
        isAuthenticated={isAuthenticated}
        initialBookmarked={isBookmarked}
        className="absolute right-3.5 top-3.5"
      />
    </div>
  );
}
