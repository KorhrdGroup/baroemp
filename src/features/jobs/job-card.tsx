import Link from "next/link";
import { Briefcase, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { labelRegion, labelWorkType } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { JobBookmarkButton } from "./job-bookmark-button";
import type { Job } from "@/types";

const CLOSING_SOON_DAYS = 7;

function isClosingSoon(job: Job): boolean {
  if (!job.applyDeadline) return false;
  const daysLeft = (new Date(job.applyDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return daysLeft >= 0 && daysLeft <= CLOSING_SOON_DAYS;
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
}

export function JobCard({ job, matchScore, matchReasonLabel, className, isAuthenticated, isBookmarked }: JobCardProps) {
  const closingSoon = isClosingSoon(job);
  const midlifeRecommended = isMidlifeRecommended(job);
  const requiresQualification = job.preferredQualifications.length > 0;

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border border-border bg-white p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {typeof matchScore === "number" && (
              <Badge className="rounded-full border-0 bg-brand-blue-400 text-label-2 font-semibold text-white">
                매칭 {matchScore}점
              </Badge>
            )}
            {job.isBeginnerFriendly && (
              <Badge className="rounded-full border-0 bg-emerald-50 text-label-2 font-semibold text-emerald-700">
                신입가능
              </Badge>
            )}
            {midlifeRecommended && (
              <Badge className="rounded-full border-0 bg-amber-50 text-label-2 font-semibold text-amber-700">
                중장년 추천
              </Badge>
            )}
            {requiresQualification && (
              <Badge variant="outline" className="rounded-full text-label-2 text-slate-500">
                자격 관련
              </Badge>
            )}
            {closingSoon && (
              <Badge className="rounded-full border-0 bg-rose-50 text-label-2 font-semibold text-rose-600">
                마감임박
              </Badge>
            )}
          </div>
          <Link href={`/jobs/${job.id}`} className="mt-2 block">
            <h3 className="line-clamp-2 text-body-1 font-bold text-slate-900 hover:text-brand-blue-600">{job.title}</h3>
          </Link>
          <p className="mt-1 text-label-1 font-medium text-slate-500">{job.companyName}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-right text-body-2 font-bold text-brand-blue-600">{job.salaryText ?? "협의 가능"}</p>
          <JobBookmarkButton
            jobId={job.id}
            jobCategory={job.jobCategory}
            isAuthenticated={isAuthenticated}
            initialBookmarked={isBookmarked}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-label-1 text-slate-500">
        <span className="flex items-center gap-1">
          <MapPin className="size-4" />
          {job.locationDetail ?? [labelRegion(job.region), job.regionSigungu].filter(Boolean).join(" ")}
        </span>
        <span className="flex items-center gap-1">
          <Briefcase className="size-4" />
          {labelWorkType(job.workType)}
        </span>
        {job.applyDeadline && (
          <span className="flex items-center gap-1">
            <Clock className="size-4" />
            {closingSoon ? "마감임박" : `~${job.applyDeadline.slice(0, 10)}`}
          </span>
        )}
      </div>

      {matchReasonLabel && (
        <p className="mt-3 rounded-lg bg-brand-blue-50/70 px-3 py-2 text-label-1 text-brand-blue-700">
          {matchReasonLabel}
        </p>
      )}

      <p className="mt-3 line-clamp-2 flex-1 text-label-1 text-slate-600">{job.description}</p>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-label-2 text-slate-400">
          {job.externalSource ? `출처 · ${job.externalSource === "work24" ? "고용24" : job.externalSource}` : "직접등록"}
        </span>
        <Link
          href={`/jobs/${job.id}`}
          className="rounded-lg bg-brand-blue-900 px-4 py-2 text-label-1 font-semibold text-white hover:bg-slate-700"
        >
          상세보기
        </Link>
      </div>
    </div>
  );
}
