import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { labelRegion, labelWorkType } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { formatSalary } from "@/lib/salary";
import { JobBookmarkButton } from "./job-bookmark-button";
import { computeJobReadiness, READINESS_BADGE_CLASS } from "./job-readiness";
import type { Job } from "@/types";

const CLOSING_SOON_DAYS = 7;

/**
 * 매칭 점수는 이 값 이상일 때만 배지로 보여준다(evaluateJobFit 의 C등급 경계).
 * 프로필이 덜 채워졌거나 직종이 다르면 대부분 0~10점이 나오는데,
 * "매칭 0점"을 카드마다 붙이면 알려주는 것 없이 지원을 단념시키기만 한다.
 */
const MATCH_SCORE_VISIBLE_MIN = 35;

/** 마감이 가까우면 "D-3"·"D-DAY", 아니면 null. 마감일 옆에 붙이고 마감임박 여부도 이걸로 판단한다. */
function ddayLabel(job: Job): string | null {
  if (!job.applyDeadline) return null;
  const daysLeft = (new Date(job.applyDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysLeft < 0 || daysLeft > CLOSING_SOON_DAYS) return null;
  const rounded = Math.ceil(daysLeft);
  return rounded === 0 ? "D-DAY" : `D-${rounded}`;
}

function isMidlifeRecommended(job: Job): boolean {
  return (
    (job.midlifeRecommendationScore ?? 0) >= 4.3 ||
    Boolean(job.recommendedAgeGroups?.some((g) => g === "50s" || g === "60s")) ||
    Boolean(job.preferentialCodes?.includes("B"))
  );
}

export interface JobCardProps {
  job: Job;
  matchScore?: number;
  matchReasonLabel?: string;
  className?: string;
  isAuthenticated?: boolean;
  isBookmarked?: boolean;
  /** 로그인 회원의 보유 자격증명. 전달되면 카드에 취업준비성 배지를 표시한다. */
  heldQualifications?: string[];
}

/**
 * 채용공고 목록 카드.
 * 지원금 결과 카드와 같은 뼈대를 쓴다 - 상단 기관/등급, 제목, 핵심 수치,
 * 그리고 맨 아래 파이프로 끊은 메타 줄. 두 목록이 같은 리듬으로 읽히게 하려는 것이다.
 */
export function JobCard({
  job,
  matchScore,
  matchReasonLabel,
  className,
  isAuthenticated,
  isBookmarked,
  heldQualifications,
}: JobCardProps) {
  const dday = ddayLabel(job);
  const closingSoon = dday !== null;
  const midlifeRecommended = isMidlifeRecommended(job);
  const readiness = heldQualifications ? computeJobReadiness(job, heldQualifications) : null;
  const location = job.locationDetail ?? [labelRegion(job.region), job.regionSigungu].filter(Boolean).join(" ");

  return (
    // 찜 버튼은 카드 Link 안에 넣을 수 없어(버튼 중첩) 형제로 두고 위에 겹친다.
    <div className={cn("relative h-full", className)}>
      <Link
        href={`/jobs/${job.id}`}
        className="group flex h-full flex-col rounded-xl border border-border bg-white p-5"
      >
        {/*
          지원금 카드의 "기관 + 적합등급" 줄에 대응한다. pr-10은 겹쳐 놓은 찜 버튼 자리.
          min-h-9 는 찜 버튼(size-9)의 높이를 이 줄이 대신 차지하게 한다.
          이게 없으면 겹쳐 둔 버튼의 아래끝이 제목 첫 줄에 그대로 닿는다.
        */}
        <div className="flex min-h-9 items-center justify-between gap-2 pr-10">
          <p className="truncate text-label-1 font-medium text-slate-500">{job.companyName}</p>
          {typeof matchScore === "number" && matchScore >= MATCH_SCORE_VISIBLE_MIN && (
            <span className="shrink-0 rounded-full bg-brand-blue-50 px-3 py-1.5 text-label-1 font-bold text-brand-blue-700">
              매칭 {matchScore}점
            </span>
          )}
        </div>

        <h3 className="mt-4 line-clamp-2 text-body-1 font-bold text-slate-900 group-hover:underline">
          {job.title}
        </h3>

        <p className="mt-2 break-keep text-body-2 font-bold text-brand-blue-600">
          {formatSalary(job)}
        </p>

        {(readiness || job.isBeginnerFriendly || midlifeRecommended || closingSoon) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {readiness && (
              <Badge className={cn("rounded-full border-0 text-label-2 font-semibold", READINESS_BADGE_CLASS[readiness.level])}>
                {readiness.label}
              </Badge>
            )}
            {job.isBeginnerFriendly && (
              <Badge variant="outline" className="rounded-full text-label-2 text-slate-500">
                신입가능
              </Badge>
            )}
            {midlifeRecommended && (
              <Badge variant="outline" className="rounded-full text-label-2 text-slate-500">
                중장년 추천
              </Badge>
            )}
            {/* 마감임박만 색을 유지한다. 나머지 태그는 공고의 분류지만 이건 시간 경고다. */}
            {closingSoon && (
              <Badge className="rounded-full border-0 bg-rose-50 text-label-2 font-semibold text-rose-600">
                마감임박
              </Badge>
            )}
          </div>
        )}

        {/* 지원금 카드와 같은 파이프 구분 메타 줄. 아이콘 없이 텍스트만 둬서 줄이 조용하다. */}
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-4 text-label-1 text-slate-500">
          {matchReasonLabel && (
            <>
              <span className="text-brand-blue-600">✓ {matchReasonLabel}</span>
              <span aria-hidden>|</span>
            </>
          )}
          {location && (
            <>
              <span>{location}</span>
              <span aria-hidden>|</span>
            </>
          )}
          <span>{labelWorkType(job.workType)}</span>
          <span aria-hidden>|</span>
          {/*
            남은 기간은 마감일을 구체화하는 값이라 날짜 바로 옆에 둔다.
            한 span 으로 묶어야 지역명이 긴 카드에서 D-day 만 다음 줄로 떨어지지 않는다.
          */}
          <span className="whitespace-nowrap">
            {job.applyDeadline ? `~${job.applyDeadline.slice(0, 10)}` : "상시채용"}
            {dday && <span className="ml-1.5 font-semibold text-rose-600">{dday}</span>}
          </span>
        </div>
      </Link>

      <JobBookmarkButton
        jobId={job.id}
        jobCategory={job.jobCategory}
        isAuthenticated={isAuthenticated}
        initialBookmarked={isBookmarked}
        className="absolute right-3 top-3"
      />
    </div>
  );
}
