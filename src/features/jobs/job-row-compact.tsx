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
        // 옅은 파랑 판 위에 흰 면만으로 띄운다 (테두리 · 호버 없이 - /draft3 구성).
        // 휴대폰 폭에서는 자격 배지를 아랫줄로 내린다. 옆에 두면 배지가 자리를 먹어 공고 제목이 몇 글자만 남고 잘린다.
        "group flex flex-col items-start gap-2 rounded-xl bg-white px-4 py-3 sm:flex-row sm:items-center sm:gap-3",
        className,
      )}
    >
      <div className="w-full min-w-0 sm:w-auto sm:flex-1">
        <p className="truncate text-caption-1 font-medium text-slate-600">{job.companyName}</p>
        <p className="mt-0.5 truncate text-body-3 font-semibold text-slate-800">{job.title}</p>
        <p className="mt-1 flex items-center gap-2 text-caption-1 font-medium text-slate-600">
          <span className="font-semibold text-brand-blue-600">
            {salary.typeLabel && <span className="mr-1 font-medium text-slate-600">{salary.typeLabel}</span>}
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
            "shrink-0 rounded-full border border-transparent text-caption-1 font-semibold",
            READINESS_BADGE_CLASS[readiness.level],
          )}
        >
          {readiness.label}
        </Badge>
      )}
    </Link>
  );
}
