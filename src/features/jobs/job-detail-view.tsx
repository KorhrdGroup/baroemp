import Link from "next/link";
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  HelpCircle,
  MapPin,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { labelCareerRequirement, labelQualification, labelRegion, labelWorkType } from "@/lib/labels";
import { JobApplyButton } from "./job-apply-button";
import { JobBookmarkButton } from "./job-bookmark-button";
import { JobViewTracker } from "./job-view-tracker";
import type { CareerContent, Job } from "@/types";
import type { JobMatchDetail } from "@/services/job-match.service";
import type { JobRequirementComparisonItem } from "@/services/job-requirement-comparison.service";

const REQUIREMENT_STATUS_STYLE: Record<string, { icon: LucideIcon; label: string; className: string }> = {
  SATISFIED: { icon: CheckCircle2, label: "충족", className: "text-emerald-700" },
  NOT_SATISFIED: { icon: XCircle, label: "미충족", className: "text-rose-600" },
  CHECK_REQUIRED: { icon: HelpCircle, label: "확인필요", className: "text-amber-700" },
  UNKNOWN: { icon: HelpCircle, label: "확인필요", className: "text-amber-700" },
};

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
      <div>
        <p className="text-slate-400">{label}</p>
        <p className="font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export function JobDetailView({
  job,
  match,
  recommendedContents,
  hasCareerSignal,
  isAuthenticated,
  isBookmarked,
  requirementComparison,
  careerGapOccupationId,
}: {
  job: Job;
  match: JobMatchDetail | null;
  recommendedContents: CareerContent[];
  hasCareerSignal: boolean;
  isAuthenticated?: boolean;
  isBookmarked?: boolean;
  requirementComparison?: JobRequirementComparisonItem[];
  careerGapOccupationId?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <JobViewTracker jobId={job.id} matchScore={match?.score} />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {job.isBeginnerFriendly && (
          <Badge className="rounded-full border-0 bg-emerald-50 text-[11px] font-semibold text-emerald-700">신입가능</Badge>
        )}
        {match && (
          <Badge className="rounded-full border-0 bg-brand-blue-500 text-[11px] font-semibold text-white">
            매칭 {match.score}점 ({match.grade})
          </Badge>
        )}
        {job.externalSource && (
          <Badge variant="outline" className="rounded-full text-[11px] text-slate-500">
            출처 · {job.externalSource === "work24" ? "고용24" : job.externalSource}
          </Badge>
        )}
      </div>

      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{job.title}</h1>
      <p className="mt-2 flex items-center gap-1.5 text-base font-medium text-slate-500">
        <Building2 className="size-4" />
        {job.companyName}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-border bg-white p-6 sm:grid-cols-2">
        <InfoRow
          icon={MapPin}
          label="근무지역"
          value={job.address ?? job.locationDetail ?? [labelRegion(job.region), job.regionSigungu].filter(Boolean).join(" ")}
        />
        <InfoRow icon={Wallet} label="급여" value={job.salaryText ?? "협의 가능"} />
        <InfoRow icon={Briefcase} label="고용형태" value={labelWorkType(job.workType)} />
        <InfoRow icon={Briefcase} label="경력조건" value={labelCareerRequirement(job.careerRequirement)} />
        <InfoRow icon={GraduationCap} label="학력" value={job.educationRequirement} />
        <InfoRow icon={Clock} label="근무시간" value={[job.workHours, job.workDays].filter(Boolean).join(" · ") || undefined} />
        <InfoRow
          icon={Calendar}
          label="마감일"
          value={job.applyDeadline ? job.applyDeadline.slice(0, 10) : "상시채용"}
        />
      </div>

      {job.preferredQualifications.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {job.preferredQualifications.map((code) => (
            <span key={code} className="rounded-full bg-amber-50 px-3 py-1 text-[13px] font-medium text-amber-700">
              {labelQualification(code)} 우대/필요
            </span>
          ))}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-900">상세 설명</h2>
        <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-slate-600">{job.description}</p>
        {job.qualificationRequirements && (
          <p className="mt-3 whitespace-pre-line text-[14px] leading-6 text-slate-500">
            필요 자격요건: {job.qualificationRequirements}
          </p>
        )}
      </div>

      {match ? (
        <div className="mt-8 rounded-2xl border border-border bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">이 공고와 내 조건 비교</h2>
          <p className="mt-1 text-[13px] text-slate-400">최근 진단 결과를 기준으로 비교했어요.</p>
          <div className="mt-4 space-y-4">
            {match.fulfilled.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-[14px] font-semibold text-emerald-700">
                  <CheckCircle2 className="size-4" /> 충족
                </p>
                <ul className="mt-1.5 space-y-1 text-[14px] text-slate-600">
                  {match.fulfilled.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
              </div>
            )}
            {match.needsCheck.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-[14px] font-semibold text-amber-700">
                  <HelpCircle className="size-4" /> 확인 필요
                </p>
                <ul className="mt-1.5 space-y-1 text-[14px] text-slate-600">
                  {match.needsCheck.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
              </div>
            )}
            {match.lacking.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-[14px] font-semibold text-rose-600">
                  <XCircle className="size-4" /> 부족
                </p>
                <ul className="mt-1.5 space-y-1 text-[14px] text-slate-600">
                  {match.lacking.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        !hasCareerSignal && (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-brand-blue-50/40 p-6 text-center">
            <p className="text-[14px] text-slate-600">직업진단을 받으면 이 공고와 내 조건을 비교해볼 수 있어요.</p>
            <Link
              href="/assessment"
              className="mt-3 inline-block rounded-lg bg-brand-blue-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-blue-600"
            >
              내게 맞는 직업 찾기
            </Link>
          </div>
        )
      )}

      {isAuthenticated && requirementComparison && requirementComparison.length > 0 && (
        <div className="mt-8 rounded-2xl border border-border bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">이 공고 요구조건과 내 준비상태</h2>
          <p className="mt-1 text-[13px] text-slate-400">이 공고 원문에서 확인된 요구조건을 회원님의 Career DB와 비교했어요.</p>
          <div className="mt-4 space-y-2">
            {requirementComparison.map((item) => {
              const style = REQUIREMENT_STATUS_STYLE[item.userStatus] ?? REQUIREMENT_STATUS_STYLE.UNKNOWN;
              const Icon = style.icon;
              return (
                <div
                  key={item.requirementId}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-[14px]"
                >
                  <span className="text-slate-700">
                    {item.requirementName}
                    <span className="ml-1.5 text-[12px] text-slate-400">
                      {item.jobLevel === "REQUIRED" ? "필수" : item.jobLevel === "PREFERRED" ? "우대" : "언급"}
                    </span>
                  </span>
                  <span className={cn("flex shrink-0 items-center gap-1 font-semibold", style.className)}>
                    <Icon className="size-4" />
                    {style.label}
                  </span>
                </div>
              );
            })}
          </div>
          <Link
            href={careerGapOccupationId ? `/career-gap?occupation=${careerGapOccupationId}&job=${job.id}` : "/career-gap"}
            className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-blue-200 bg-brand-blue-50/60 text-[14px] font-semibold text-brand-blue-700 hover:bg-brand-blue-100"
          >
            내 취업 준비도 전체보기
          </Link>
        </div>
      )}

      {recommendedContents.length > 0 && (
        <div className="mt-8 rounded-2xl border border-border bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">이 공고에 필요한 준비</h2>
          <p className="mt-1 text-[13px] text-slate-400">이 공고와 관련된 자격/교육 과정이에요.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {recommendedContents.map((content) => (
              <div key={content.id} className="rounded-xl border border-border p-4">
                <p className="text-[15px] font-semibold text-slate-800">{content.title}</p>
                <p className="mt-1 text-[13px] text-slate-500">{content.summary ?? content.shortDescription}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row">
        <JobApplyButton jobId={job.id} sourceUrl={job.sourceUrl} className="h-12 flex-1 bg-brand-blue-500 hover:bg-brand-blue-600" />
        <JobBookmarkButton
          jobId={job.id}
          jobCategory={job.jobCategory}
          variant="full"
          isAuthenticated={isAuthenticated}
          initialBookmarked={isBookmarked}
        />
      </div>

      <Link
        href={`/resume/new?job=${job.id}`}
        className="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-blue-200 bg-brand-blue-50/60 text-[14px] font-semibold text-brand-blue-700 hover:bg-brand-blue-100"
      >
        <FileText className="size-4" />이 공고에 맞는 이력서 만들기
      </Link>

      {job.sourceUrl && (
        <p className="mt-3 text-center text-[12px] text-slate-400">
          이 공고는 {job.externalSource === "work24" ? "고용24" : "외부"}에서 제공한 정보입니다. 지원 시 원본 페이지로 이동합니다.
        </p>
      )}
    </div>
  );
}
