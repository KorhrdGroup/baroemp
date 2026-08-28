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
import { formatSalary } from "@/lib/salary";
import { labelCareerRequirement, labelQualification, labelRegion, labelWorkType } from "@/lib/labels";
import { JobApplyButton } from "./job-apply-button";
import { JobBookmarkButton } from "./job-bookmark-button";
import { JobViewTracker } from "./job-view-tracker";
import type { CareerContent, Job } from "@/types";
import type { JobMatchDetail } from "@/services/job-match.service";
import type { JobRequirementComparisonItem } from "@/services/job-requirement-comparison.service";
import { BackButton } from "@/components/common/back-button";


/**
 * "이 공고와 내 조건 비교" 묶음.
 * 초록은 갖춘 것, 주황은 공고 원문만으로 판단이 안 되는 것, 빨강은 모자란 것.
 */
const COMPARISON_GROUPS = [
  {
    key: "fulfilled",
    label: "충족",
    icon: CheckCircle2,
    box: "bg-emerald-50/60",
    head: "text-emerald-700",
  },
  {
    key: "needsCheck",
    label: "확인 필요",
    icon: HelpCircle,
    box: "bg-orange-50/60",
    head: "text-orange-600",
  },
  {
    key: "lacking",
    label: "부족",
    icon: XCircle,
    box: "bg-rose-50/60",
    head: "text-rose-600",
  },
] as const satisfies readonly {
  key: "fulfilled" | "needsCheck" | "lacking";
  label: string;
  icon: LucideIcon;
  box: string;
  head: string;
}[];

const REQUIREMENT_STATUS_STYLE: Record<string, { icon: LucideIcon; label: string; className: string }> = {
  SATISFIED: { icon: CheckCircle2, label: "충족", className: "text-emerald-700" },
  NOT_SATISFIED: { icon: XCircle, label: "미충족", className: "text-rose-600" },
  CHECK_REQUIRED: { icon: HelpCircle, label: "확인필요", className: "text-orange-600" },
  UNKNOWN: { icon: HelpCircle, label: "확인필요", className: "text-orange-600" },
};

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 text-label-1">
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
}: {
  job: Job;
  match: JobMatchDetail | null;
  recommendedContents: CareerContent[];
  hasCareerSignal: boolean;
  isAuthenticated?: boolean;
  isBookmarked?: boolean;
  requirementComparison?: JobRequirementComparisonItem[];
}) {
  return (
    // 지원금 상세와 같은 뼈대: 회색 바탕 위에 흰 카드를 쌓고, 지원 동작은 하단에 고정한다.
    <div className="min-h-screen bg-slate-50">
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <JobViewTracker jobId={job.id} matchScore={match?.score} />

      <div className="mb-4 -ml-2">
        <BackButton fallbackHref="/jobs" label="목록으로 돌아가기" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {job.isBeginnerFriendly && (
          <Badge variant="outline" className="rounded-full text-label-2 text-slate-500">신입가능</Badge>
        )}
        {job.externalSource && (
          <Badge variant="outline" className="rounded-full text-label-2 text-slate-500">
            출처 · {job.externalSource === "work24" ? "고용24" : job.externalSource}
          </Badge>
        )}
      </div>

      <h1 className="break-keep text-balance text-title-2 font-bold text-slate-900 sm:text-headline-3">{job.title}</h1>
      <p className="mt-2 flex items-center gap-1.5 text-body-2 font-medium text-slate-500">
        <Building2 className="size-4" />
        {job.companyName}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 rounded-xl bg-white p-6 sm:grid-cols-2">
        <InfoRow
          icon={MapPin}
          label="근무지역"
          value={job.address ?? job.locationDetail ?? [labelRegion(job.region), job.regionSigungu].filter(Boolean).join(" ")}
        />
        <InfoRow icon={Wallet} label="급여" value={formatSalary(job)} />
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
        <div className="mt-6 rounded-xl bg-white p-6">
          <h2 className="text-body-1 font-bold text-slate-900">우대·필요 자격</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {job.preferredQualifications.map((code) => (
              <span key={code} className="rounded-full bg-brand-blue-50 px-3 py-1 text-label-1 font-medium text-brand-blue-600">
                {labelQualification(code)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl bg-white p-6">
        <h2 className="text-body-1 font-bold text-slate-900">상세 설명</h2>
        <p className="mt-3 whitespace-pre-line text-body-2-reading text-slate-600">{job.description}</p>
        {job.qualificationRequirements && (
          <p className="mt-3 whitespace-pre-line text-label-1 text-slate-500">
            필요 자격요건: {job.qualificationRequirements}
          </p>
        )}
      </div>

      {match ? (
        <div className="mt-6 rounded-xl bg-white p-6">
          <h2 className="text-body-1 font-bold text-slate-900">이 공고와 내 조건 비교</h2>
          <p className="mt-1 text-label-1 text-slate-400">최근 진단 결과를 기준으로 비교했어요.</p>
          {/*
            지원금 상세의 "내 조건과 비교"와 같은 방식.
            글머리표만 색을 달리하면 어디까지가 한 묶음인지 흐려서, 묶음마다
            색 있는 면을 깔아 충족·확인 필요·부족을 한눈에 가른다.
          */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {COMPARISON_GROUPS.map(({ key, label, icon: Icon, box, head }) => {
              const values = match[key];
              if (values.length === 0) return null;
              return (
                <div key={key} className={cn("rounded-lg p-4", box)}>
                  <p className={cn("flex items-center gap-1.5 text-label-1 font-semibold", head)}>
                    <Icon className="size-4" /> {label}
                  </p>
                  <ul className="mt-2 space-y-1 text-label-1 text-slate-600">
                    {values.map((f) => (
                      <li key={f}>· {f}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        !hasCareerSignal && (
          <div className="mt-6 rounded-xl bg-brand-blue-50/40 p-6 text-center">
            <p className="text-label-1 text-slate-600">직업진단을 받으면 이 공고와 내 조건을 비교해볼 수 있어요.</p>
            <Link
              href="/assessment"
              className="mt-3 inline-block rounded-lg bg-brand-blue-400 px-4 py-2 text-label-1 font-semibold text-white hover:bg-brand-blue-600"
            >
              내게 맞는 직업 찾기
            </Link>
          </div>
        )
      )}

      {isAuthenticated && requirementComparison && requirementComparison.length > 0 && (
        <div className="mt-6 rounded-xl bg-white p-6">
          <h2 className="text-body-1 font-bold text-slate-900">이 공고 요구조건과 내 준비상태</h2>
          <p className="mt-1 text-label-1 text-slate-400">이 공고 원문에서 확인된 요구조건을 회원님의 Career DB와 비교했어요.</p>
          <div className="mt-4 space-y-2">
            {requirementComparison.map((item) => {
              const style = REQUIREMENT_STATUS_STYLE[item.userStatus] ?? REQUIREMENT_STATUS_STYLE.UNKNOWN;
              const Icon = style.icon;
              return (
                <div
                  key={item.requirementId}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-label-1"
                >
                  <span className="text-slate-700">
                    {item.requirementName}
                    <span className="ml-1.5 text-label-2 text-slate-400">
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
        </div>
      )}

      {recommendedContents.length > 0 && (
        <div className="mt-6 rounded-xl bg-white p-6">
          <h2 className="text-body-1 font-bold text-slate-900">이 공고에 필요한 준비</h2>
          <p className="mt-1 text-label-1 text-slate-400">이 공고와 관련된 자격/교육 과정이에요.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {recommendedContents.map((content) => (
              <div key={content.id} className="rounded-xl border border-border p-4">
                <p className="text-body-2 font-semibold text-slate-800">{content.title}</p>
                <p className="mt-1 text-label-1 text-slate-500">{content.summary ?? content.shortDescription}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href={`/resume/new?job=${job.id}`}
        className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-label-1 font-semibold text-brand-blue-700 hover:bg-brand-blue-50"
      >
        <FileText className="size-4" />이 공고에 맞는 이력서 만들기
      </Link>

      {job.sourceUrl && (
        <p className="mt-6 text-center text-label-2 text-slate-400">
          이 공고는 {job.externalSource === "work24" ? "고용24" : "외부"}에서 제공한 정보입니다. 지원 시 원본 페이지로 이동합니다.
        </p>
      )}

      {/* 하단 고정 CTA가 마지막 내용을 가리지 않도록 비워둔다. */}
      <div className="h-24" />
    </div>

    {/* ── 하단 고정 CTA ── */}
    <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <JobApplyButton jobId={job.id} sourceUrl={job.sourceUrl} className="h-12 flex-1 bg-brand-blue-400 hover:bg-brand-blue-600" />
        <JobBookmarkButton
          jobId={job.id}
          jobCategory={job.jobCategory}
          variant="full"
          isAuthenticated={isAuthenticated}
          initialBookmarked={isBookmarked}
        />
      </div>
    </div>
    </div>
  );
}
