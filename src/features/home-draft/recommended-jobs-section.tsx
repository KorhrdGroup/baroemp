import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Job } from "@/types";
import { DraftJobCard } from "./draft-job-card";

/**
 * 최근 공고. 회색 바탕 페이지에서 이 구간만 흰 판으로 깔아 나눈다.
 * 휴대폰에서는 옆으로 넘겨 보고(앱의 가로 목록과 같은 동작), 넓은 화면에서는 격자로 펼친다.
 */
export function RecommendedJobsSection({
  jobs,
  isAuthenticated,
  bookmarkedIds,
}: {
  jobs: Job[];
  isAuthenticated: boolean;
  bookmarkedIds: string[];
}) {
  const bookmarked = new Set(bookmarkedIds);
  return (
    <section className="mt-8 border-y border-border bg-white py-8 sm:mt-12 sm:py-12">
      <div className="mx-auto max-w-7xl px-4.5 lg:px-8">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-title-3 font-bold tracking-tight text-slate-900 sm:text-title-1">최근 올라온 공고</h2>
          <Link
            href="/jobs?sort=latest"
            className="inline-flex shrink-0 items-center gap-0.5 text-body-2 font-semibold text-slate-700 hover:text-slate-900"
          >
            더보기
            <ChevronRight className="size-4" />
          </Link>
        </div>

        <div className="scrollbar-hidden -mx-4.5 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4.5 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {jobs.map((job) => (
            <div key={job.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
              <DraftJobCard job={job} isAuthenticated={isAuthenticated} isBookmarked={bookmarked.has(job.id)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
