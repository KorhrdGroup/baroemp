import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { labelRegion } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { splitSalary } from "@/lib/salary";
import { READINESS_BADGE_CLASS, type JobReadiness } from "./job-readiness";
import type { Job } from "@/types";

/**
 * 한 줄짜리 촘촘한 공고 행.
 *
 * 검사 맞춤 공고처럼 "여러 섹션이 쌓이는" 자리에서 쓴다. 모든 섹션이 같은 큰 카드
 * 그리드면 어디까지가 한 묶음인지 눈에 안 잡혀서, 이 행은 제목·급여·지역만 남겨
 * 밀도를 높였다. 찜 버튼은 두지 않는다 - 자세히 볼 공고는 눌러서 상세로 간다.
 */
export function JobRowCompact({
  job,
  readiness,
  outsideRegion = false,
  className,
}: {
  job: Job;
  readiness?: JobReadiness;
  /** 희망지역 공고가 모자라 다른 지역에서 채워 온 줄. 아무 말 없이 섞으면 집 근처인 줄 안다. */
  outsideRegion?: boolean;
  className?: string;
}) {
  const salary = splitSalary(job);
  const location = [labelRegion(job.region), job.regionSigungu].filter(Boolean).join(" ");

  return (
    <Link
      href={`/jobs/${job.id}`}
      className={cn(
        // 호버는 배경만 연파랑으로. 테두리·제목 색까지 파래지면 목록에서 눈이 시끄럽다.
        "group flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 transition-colors hover:bg-brand-blue-50/40",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-label-2 font-medium text-slate-400">{job.companyName}</p>
        <p className="mt-0.5 truncate text-label-1 font-semibold text-slate-800 group-hover:underline">{job.title}</p>
        <p className="mt-1 flex items-center gap-2 text-label-2 text-slate-500">
          <span className="font-semibold text-brand-blue-600">
            {salary.typeLabel && <span className="mr-1 font-medium text-slate-400">{salary.typeLabel}</span>}
            {salary.amount}
          </span>
          {location && <span className="truncate">{location}</span>}
          {outsideRegion && (
            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">희망지역 밖</span>
          )}
        </p>
      </div>
      {readiness && (
        <Badge
          className={cn(
            "shrink-0 rounded-full border border-transparent text-label-2 font-semibold",
            READINESS_BADGE_CLASS[readiness.level],
          )}
        >
          {readiness.label}
        </Badge>
      )}
    </Link>
  );
}
