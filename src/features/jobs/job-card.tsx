import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { labelRegion, labelWorkType } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { splitSalary } from "@/lib/salary";
import { JobBookmarkButton } from "./job-bookmark-button";
import { READINESS_BADGE_CLASS, type JobReadiness } from "./job-readiness";
import type { Job } from "@/types";

const CLOSING_SOON_DAYS = 7;

/** 마감이 가까우면 "D-3"·"D-DAY", 아니면 null. 마감일 옆에 붙이고 마감임박 여부도 이걸로 판단한다. */
function ddayLabel(job: Job): string | null {
  if (!job.applyDeadline) return null;
  const daysLeft = (new Date(job.applyDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysLeft < 0 || daysLeft > CLOSING_SOON_DAYS) return null;
  const rounded = Math.ceil(daysLeft);
  return rounded === 0 ? "D-DAY" : `D-${rounded}`;
}

/**
 * 색으로 말하지 않는 배지에만 그림문자를 붙인다.
 * 자격 충족(초록)·마감임박(빨강)은 이미 색이 뜻을 말하고 있어, 그림문자까지 얹으면
 * 배지 하나가 색·그림·글자 셋으로 같은 말을 한다.
 * 읽어줄 것은 글자뿐이라 그림문자는 aria-hidden 으로 감춘다.
 */
export function isMidlifeRecommended(job: Job): boolean {
  return (
    (job.midlifeRecommendationScore ?? 0) >= 4.3 ||
    Boolean(job.recommendedAgeGroups?.some((g) => g === "50s" || g === "60s")) ||
    Boolean(job.preferentialCodes?.includes("B"))
  );
}

export interface JobCardProps {
  job: Job;
  matchReasonLabel?: string;
  className?: string;
  isAuthenticated?: boolean;
  isBookmarked?: boolean;
  /** 로그인 회원의 보유 자격증명. 전달되면 카드에 취업준비성 배지를 표시한다. */
  /**
   * 서버에서 계산한 자격 준비 상태. 판정에 요건 사전(career_requirements)이 필요해
   * 카드 안에서 만들 수 없다. 없으면 배지를 띄우지 않는다.
   */
  readiness?: JobReadiness;
  /** 호버 시 카드 면을 연파랑으로. 전체 공고 목록처럼 카드가 큰 자리에서만 켠다 (큐레이션 띠는 끔). */
  hoverTint?: boolean;
}

/**
 * 채용공고 목록 카드.
 * 지원금 결과 카드와 같은 뼈대를 쓴다 - 상단 기관/등급, 제목, 핵심 수치,
 * 그리고 맨 아래 파이프로 끊은 메타 줄. 두 목록이 같은 리듬으로 읽히게 하려는 것이다.
 */
export function JobCard({
  job,
  matchReasonLabel,
  className,
  isAuthenticated,
  isBookmarked,
  readiness,
  hoverTint,
}: JobCardProps) {
  const salary = splitSalary(job);
  const dday = ddayLabel(job);
  const closingSoon = dday !== null;
  const midlifeRecommended = isMidlifeRecommended(job);
  const location = job.locationDetail ?? [labelRegion(job.region), job.regionSigungu].filter(Boolean).join(" ");

  return (
    // 찜 버튼은 카드 Link 안에 넣을 수 없어(버튼 중첩) 형제로 두고 위에 겹친다.
    <div className={cn("relative h-full", className)}>
      {/* 기본 호버 표시는 제목 밑줄 하나. 촘촘한 띠(큐레이션)에서 면까지 파래지면 눈이 시끄럽다. */}
      <Link
        href={`/jobs/${job.id}`}
        className={cn(
          "group flex h-full flex-col rounded-xl border border-border bg-white p-5",
          hoverTint && "transition-colors hover:bg-brand-blue-50/40",
        )}
      >
        {/*
          지원금 카드의 "기관 + 적합등급" 줄에 대응한다. pr-10은 겹쳐 놓은 찜 버튼 자리.

          줄 높이를 늘려 잡지 않는다. 버튼(size-8) 높이에 맞춰 32px 로 벌리면
          회사명과 제목 사이가 붕 떠 보인다. 대신 버튼을 회사명 글자의
          세로 가운데(top-3.5)에 맞춰 이 줄과 짝지어 보이게 한다.

          오른쪽도 같은 14px 로 둔다. 카드 여백선(20px)에 맞추면 위아래 간격이
          달라 모서리가 어긋나 보이고, 위를 20px 로 내리면 제목 첫 줄과 겹친다.
        */}
        <div className="flex items-center justify-between gap-2 pr-10">
          <p className="truncate text-label-1 font-medium text-slate-500">{job.companyName}</p>
        </div>

        {/*
          회사명과 제목은 "누가 무엇을"이라 한 덩어리로 붙이고(mt-2),
          급여는 별개의 사실이라 한 칸 띄운다(mt-3).
        */}
        {/*
          break-keep 이 없으면 한글이 음절 단위로 잘려 "모집합니 / 다." 처럼 끊긴다.
          text-balance 는 두 줄 길이를 맞춰 마지막 줄에 한 단어만 남는 걸 막는다.
          둘을 같이 써야 한다 - balance 만 주면 오히려 단어 중간에서 끊는다.
          balance 를 모르는 브라우저는 break-keep 만 적용되어 그대로 쓸 만하다.

          줄간격은 body-1 기본값이 120%(21.6px)라 두 줄이 붙어 보인다.
          같은 시스템의 body-1-reading 과 같은 140%(25.2px)로 띄운다.
        */}
        <h3 className="mt-2 line-clamp-2 break-keep text-balance text-body-1 leading-[1.4] font-bold text-slate-900 group-hover:underline">
          {job.title}
        </h3>

        {/* 종류는 금액을 읽는 단위일 뿐이라 무채색으로 두고, 금액만 파랗게 강조한다. */}
        <p className="mt-3 break-keep text-body-2 font-bold text-brand-blue-600">
          {salary.typeLabel && <span className="mr-1 font-medium text-slate-500">{salary.typeLabel}</span>}
          {salary.amount}
        </p>

        {/*
          채운 배지에도 투명 테두리를 준다. border-0 은 24.8px, 아웃라인 배지는
          1px 테두리 때문에 26.8px 라, 배지 조합에 따라 카드가 2px 달라져
          탭을 옮길 때 판이 덜컹거렸다. 배경은 border-box 로 칠해져 보이는 건 같다.
        */}
        {(readiness || job.isBeginnerFriendly || midlifeRecommended || closingSoon) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {readiness && (
              <Badge className={cn("rounded-full border border-transparent text-label-2 font-semibold", READINESS_BADGE_CLASS[readiness.level])}>
                {readiness.label}
              </Badge>
            )}
            {job.isBeginnerFriendly && (
              <Badge variant="outline" className="rounded-full text-label-2 text-slate-500">
                <span aria-hidden className="mr-0.5">🌱</span>
                신입가능
              </Badge>
            )}
            {midlifeRecommended && (
              <Badge variant="outline" className="rounded-full text-label-2 text-slate-500">
                <span aria-hidden className="mr-0.5">🙌</span>
                중장년 추천
              </Badge>
            )}
            {/* 마감임박만 색을 유지한다. 나머지 태그는 공고의 분류지만 이건 시간 경고다. */}
            {closingSoon && (
              <Badge className="rounded-full border border-transparent bg-rose-50 text-label-2 font-semibold text-rose-600">
                마감임박
              </Badge>
            )}
          </div>
        )}

        {/*
          지원금 카드와 같은 파이프 구분 메타 줄. 아이콘 없이 텍스트만 둬서 줄이 조용하다.

          맞은 근거가 붙으면 두 줄, 없으면 한 줄이 되는데 카드 높이는 그 줄의
          제일 큰 카드를 따라간다. 그래서 탭을 옮길 때마다 판 높이가 튀었다.
          두 줄 자리를 늘 잡아 둔다: pt-4(1rem) + 19.6px 두 줄 + gap-y-1(0.25rem).
          content-end 는 남는 자리를 위에 두고 글자를 아래에 붙인다. 카드의 마지막
          줄이라 아래 여백에 맞춰 떨어져 있어야 카드마다 바닥선이 같아 보인다.
        */}
        <div className="mt-auto flex min-h-[3.7rem] flex-wrap content-end items-center gap-x-2 gap-y-1 pt-4 text-label-1 font-medium text-slate-500">
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
        className="absolute right-3.5 top-3.5"
      />
    </div>
  );
}
