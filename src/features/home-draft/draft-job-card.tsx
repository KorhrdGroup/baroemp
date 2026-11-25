import Link from "next/link";
import { createLucideIcon } from "lucide-react";
import { JobBookmarkButton } from "@/features/jobs/job-bookmark-button";
import { isMidlifeRecommended } from "@/features/jobs/job-card";
import { labelCareerRequirement, labelRegion, labelWorkType } from "@/lib/labels";
import { splitSalary } from "@/lib/salary";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";

/**
 * 원화(₩)가 새겨진 동전. lucide 에 원화 그림이 없어 같은 방식(24칸, 둥근 선)으로 그린다 -
 * 옆 핀 그림과 선 두께·크기가 똑같이 맞는다. 작은 크기라 ₩ 의 가로줄은 하나만 긋는다.
 */
const WonCoin = createLucideIcon("won-coin", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "coin" }],
  ["path", { d: "M7 8.5l2.5 7 2.5-5.5 2.5 5.5 2.5-7", key: "w" }],
  ["path", { d: "M6.5 12h11", key: "bar" }],
]);

export function daysLeft(job: Job): number | null {
  if (!job.applyDeadline) return null;
  return Math.ceil((new Date(job.applyDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function deadlineLabel(left: number | null): string {
  if (left === null) return "상시채용";
  if (left < 0) return "마감";
  return left === 0 ? "오늘 마감" : `D-${left}`;
}

/**
 * 카드의 지역은 "시·도 + 시·군·구 첫 낱말"까지만 쓴다.
 * 일반구를 둔 시("수원시 장안구", "창원시 마산회원구")는 구를 떼어 "경기 수원시"로 줄인다.
 * 그러면 가장 긴 것도 "경기 남양주시"·"인천 미추홀구" 정도(7자)라 회사 이름 자리가 남는다.
 * 세부 지역은 공고 상세에서 본다.
 */
export function shortLocation(job: Job): string {
  const sido = job.region ? labelRegion(job.region) : "";
  const sigungu = job.regionSigungu?.trim().split(/\s+/)[0];
  return [sido, sigungu].filter(Boolean).join(" ");
}

/** 카드 아래 태그: 경력 조건 · 고용형태 · 중장년 추천. 일자리찾기 목록 카드와 같은 기준을 쓴다. */
function jobTags(job: Job): string[] {
  const career = job.isBeginnerFriendly ? "신입가능" : labelCareerRequirement(job.careerRequirement);
  const workType = labelWorkType(job.workType);
  return [
    career !== "-" ? career : null,
    workType !== "-" ? workType : null,
    isMidlifeRecommended(job) ? "중장년 추천" : null,
  ].filter((t): t is string => Boolean(t));
}

/**
 * 시안의 공고 카드. 잡아바의 교육 카드처럼 흰 면 · 옅은 테두리에, 위에서 아래로
 * 제목(굵게) → 회사 · 지역 → 급여 → 조건 태그 · 남은 날 순으로 놓는다.
 * 색은 마감이 가까운 남은 날 하나에만 쓴다 - 띠·동그라미에 색을 쓰면 카드가 여럿 모일 때 어지럽다.
 */
export function DraftJobCard({
  job,
  isAuthenticated,
  isBookmarked,
  borderless = false,
}: {
  job: Job;
  isAuthenticated: boolean;
  isBookmarked: boolean;
  /** 회색 판 위에 놓일 때는 테두리 없이 흰 면만으로 띄운다. */
  borderless?: boolean;
}) {
  const salary = splitSalary(job);
  const location = shortLocation(job);
  const left = daysLeft(job);
  const urgent = left !== null && left >= 0 && left <= 7;
  const tags = jobTags(job);
  return (
    <div className="relative h-full">
      <Link
        href={`/jobs/${job.id}`}
        className={cn("flex h-full flex-col rounded-2xl bg-white p-5", !borderless && "border border-border")}
      >
        <h3 className="line-clamp-2 text-body-1 leading-[1.4] font-semibold break-keep text-slate-900">
          {job.title}
        </h3>
        {/* 회사 · 지역을 한 줄로. 회사 이름이 길면 회사 쪽 끝을 줄이고 지역은 끝까지 보인다. */}
        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-body-3 font-medium text-slate-600">
          <span className="truncate">{job.companyName}</span>
          {location && (
            <>
              <span aria-hidden className="size-0.5 shrink-0 rounded-full bg-slate-400" />
              <span className="shrink-0 whitespace-nowrap">{location}</span>
            </>
          )}
        </p>

        {/*
          급여는 혼자 한 줄 - 범위 급여도 다 보인다. 항목 이름은 그림으로 대신하고 낱말은 화면 읽기 프로그램에만 남긴다.
          동전은 칸 한가운데에 놓이지만 한글·숫자의 눈에 보이는 중심은 그보다 1px 남짓 위라 1px 올린다.
        */}
        <p className="mt-3 flex items-center gap-1.5 text-body-3">
          <WonCoin className="size-3.5 shrink-0 -translate-y-px text-slate-500" absoluteStrokeWidth strokeWidth={1.5} aria-hidden />
          <span className="sr-only">급여</span>
          <span className="truncate font-semibold text-slate-900">
            {salary.typeLabel && <span className="mr-1 font-medium text-slate-600">{salary.typeLabel}</span>}
            {salary.amount}
          </span>
        </p>

        {/*
          아래 줄: 왼쪽은 조건 태그(한 줄만, 넘치면 감춤), 오른쪽은 남은 날 → 찜 버튼 순.
          찜 버튼은 링크 밖에 겹쳐 놓아 그 폭(pr-9)만큼 비워 둔다.
          7일 안에 마감이면 빨강 #D04040(흰 바탕 대비 4.68:1, KRDS 4.5:1 이상), 아니면 회색.
        */}
        <div className="mt-auto flex items-center gap-2 pt-4 pr-9">
          {/* 태그 글자는 칸 가운데에 두되, 한글은 눈에 보이는 중심이 글자 칸보다 위라 1px(pt-px) 내린다. */}
          <ul className="flex h-6 min-w-0 flex-1 flex-wrap gap-1.5 overflow-hidden">
            {tags.map((tag) => (
              <li key={tag} className="flex h-6 items-center rounded bg-slate-100 px-2 pt-px text-caption-1 font-medium text-slate-700">
                {tag}
              </li>
            ))}
          </ul>
          <span className={cn("shrink-0 text-caption-1", urgent ? "font-bold text-[#D04040]" : "font-medium text-slate-600")}>
            {deadlineLabel(left)}
          </span>
        </div>
      </Link>
      <JobBookmarkButton
        jobId={job.id}
        isAuthenticated={isAuthenticated}
        initialBookmarked={isBookmarked}
        className="absolute right-3 bottom-4"
      />
    </div>
  );
}
