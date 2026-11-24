import Link from "next/link";
import { JobBookmarkButton } from "@/features/jobs/job-bookmark-button";
import { labelRegion } from "@/lib/labels";
import { splitSalary } from "@/lib/salary";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";

function daysLeft(job: Job): number | null {
  if (!job.applyDeadline) return null;
  return Math.ceil((new Date(job.applyDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function deadlineLabel(left: number | null): string {
  if (left === null) return "상시채용";
  if (left < 0) return "마감";
  return left === 0 ? "오늘 마감" : `D-${left}`;
}

/**
 * 시안의 공고 카드. 잡아바의 교육 카드처럼 흰 면 · 옅은 테두리에, 위에서 아래로
 * 회사(옅게) → 제목(굵게) → "급여 · 지역" 항목 줄 → 남은 날 순으로 놓는다.
 * 색은 마감이 가까운 남은 날 하나에만 쓴다 - 띠·동그라미에 색을 쓰면 카드가 여럿 모일 때 어지럽다.
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
  const left = daysLeft(job);
  const urgent = left !== null && left >= 0 && left <= 7;
  return (
    <div className="relative h-full">
      <Link
        href={`/jobs/${job.id}`}
        className="flex h-full min-h-52 flex-col rounded-2xl border border-border bg-white p-5"
      >
        <p className="truncate text-body-3 font-medium text-slate-600">{job.companyName}</p>

        <h3 className="mt-1.5 line-clamp-2 text-body-1 leading-[1.4] font-semibold break-keep text-slate-900">
          {job.title}
        </h3>

        {/* 항목 이름 칸을 같은 폭으로 잡아 값이 한 줄로 맞춰 선다. */}
        <dl className="mt-3 space-y-1 text-body-3">
          <div className="flex gap-3">
            <dt className="w-8 shrink-0 font-medium text-slate-600">급여</dt>
            <dd className="truncate font-semibold text-slate-900">
              {salary.typeLabel && <span className="mr-1 font-medium text-slate-600">{salary.typeLabel}</span>}
              {salary.amount}
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-8 shrink-0 font-medium text-slate-600">지역</dt>
            <dd className="truncate font-medium text-slate-700">{location || "정보 없음"}</dd>
          </div>
        </dl>

        {/* 아래 줄 오른쪽은 찜 버튼 자리다. */}
        <p className={cn("mt-auto pt-4 text-body-3", urgent ? "font-bold text-rose-600" : "font-medium text-slate-600")}>
          {deadlineLabel(left)}
        </p>
      </Link>
      <JobBookmarkButton
        jobId={job.id}
        isAuthenticated={isAuthenticated}
        initialBookmarked={isBookmarked}
        className="absolute right-3 bottom-3"
      />
    </div>
  );
}
