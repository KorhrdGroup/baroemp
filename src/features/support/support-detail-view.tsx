import Link from "next/link";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Coins,
  FileText,
  HelpCircle,
  MapPin,
  Phone,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { labelEmploymentStatus, labelRegion } from "@/lib/labels";
import { SUPPORT_CATEGORY_LABELS, SUPPORT_ELIGIBILITY_GRADE_LABELS } from "@/types";
import type { CareerContent, Region, SupportEligibilityGrade, SupportProgram } from "@/types";
import type { SupportMatchDetail } from "@/services/support-eligibility.service";
import { SupportApplyButton } from "./support-apply-button";
import { SupportBookmarkButton } from "./support-bookmark-button";
import { SupportViewTracker } from "./support-view-tracker";
import { SupportLongText } from "./support-long-text";

const GRADE_BADGE_CLASS: Record<SupportEligibilityGrade, string> = {
  HIGH: "bg-emerald-500",
  MEDIUM: "bg-brand-blue-400",
  CHECK_REQUIRED: "bg-orange-500",
  LOW: "bg-slate-400",
};

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 text-label-1">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
      <div>
        <p className="text-slate-400">{label}</p>
        {/* 실 API는 짧은 사실 필드에도 안내문 전체를 담아 보내는 경우가 있어 길이를 제한한다. */}
        <p className="line-clamp-3 font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

/**
 * 실 API는 "지원내용" 필드에 안내문 전체를 그대로 담아 보내기도 한다.
 * 그러면 정보 그리드와 아래 "사업 상세"에 같은 글이 두 번 나오므로, 겹칠 때는 그리드에서 뺀다.
 */
function benefitSummary(program: SupportProgram): string | undefined {
  const benefit = program.benefitDescription?.trim();
  if (!benefit) return program.supportAmountText;
  if (program.description && benefit === program.description.trim()) {
    return program.supportAmountText;
  }
  return benefit;
}

function targetSummary(program: SupportProgram): string | undefined {
  if (program.targetDescription) return program.targetDescription;
  const parts: string[] = [];
  if (program.targetAgeMin || program.targetAgeMax) {
    parts.push(`만 ${program.targetAgeMin ?? 0}세${program.targetAgeMax ? `~${program.targetAgeMax}세` : " 이상"}`);
  }
  if (program.employmentStatusTargets?.length) {
    parts.push(program.employmentStatusTargets.map((s) => labelEmploymentStatus(s)).join("/"));
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function SupportDetailView({
  program,
  match,
  recommendedContents,
  hasMatchSignal,
  isAuthenticated,
  isBookmarked,
}: {
  program: SupportProgram;
  match: SupportMatchDetail | null;
  recommendedContents: CareerContent[];
  hasMatchSignal: boolean;
  isAuthenticated?: boolean;
  isBookmarked?: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <SupportViewTracker supportProgramId={program.id} matchScore={match?.score} eligibilityGrade={match?.grade} />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="rounded-full text-label-2 text-slate-500">
          {SUPPORT_CATEGORY_LABELS[program.category] ?? program.category}
        </Badge>
        {match && (
          <Badge className={cn("rounded-full border-0 text-label-2 font-semibold text-white", GRADE_BADGE_CLASS[match.grade])}>
            {SUPPORT_ELIGIBILITY_GRADE_LABELS[match.grade]} ({match.score}점)
          </Badge>
        )}
        {program.externalSource && program.externalSource !== "mock" && (
          <Badge variant="outline" className="rounded-full text-label-2 text-slate-500">
            출처 · {program.externalSource}
          </Badge>
        )}
      </div>

      <h1 className="text-title-2 font-bold text-slate-900 sm:text-headline-3">{program.title}</h1>
      <p className="mt-2 flex items-center gap-1.5 text-body-2 font-medium text-slate-500">
        <Building2 className="size-4" />
        {program.organizationName ?? program.organization}
        {program.departmentName && <span className="text-slate-400">· {program.departmentName}</span>}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-border bg-white p-6 sm:grid-cols-2">
        <InfoRow icon={Users} label="지원대상" value={targetSummary(program)} />
        <InfoRow
          icon={MapPin}
          label="지역"
          value={
            program.regionScope === "national" || !program.regionScope
              ? "전국"
              : labelRegion(program.regionScope as Region)
          }
        />
        <InfoRow icon={Coins} label="지원내용" value={benefitSummary(program)} />
        <InfoRow icon={Calendar} label="신청기간" value={program.applicationPeriod ?? "상시"} />
        <InfoRow icon={FileText} label="신청방법" value={program.applicationMethod} />
        <InfoRow icon={Phone} label="문의처" value={program.contact} />
      </div>

      {program.requiredDocuments && program.requiredDocuments.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {program.requiredDocuments.map((doc) => (
            <span key={doc} className="rounded-full bg-slate-100 px-3 py-1 text-label-1 font-medium text-slate-600">
              {doc}
            </span>
          ))}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-body-1 font-bold text-slate-900">사업 상세</h2>
        {program.description && (
          <div className="mt-3">
            <SupportLongText text={program.description} className="text-body-2-reading text-slate-600" />
          </div>
        )}
        {program.eligibilityRaw && (
          <div className="mt-3">
            <SupportLongText
              text={`지원대상 원문: ${program.eligibilityRaw}`}
              className="text-label-1 text-slate-500"
            />
          </div>
        )}
      </div>

      {match ? (
        <div className="mt-8 rounded-xl border border-border bg-white p-6">
          <h2 className="text-body-1 font-bold text-slate-900">내 조건과 비교</h2>
          <p className="mt-1 text-label-1 text-slate-400">
            입력하신 조건을 기준으로 한 참고 정보이며, 최종 신청 가능 여부는 운영기관에서 확인해야 합니다.
          </p>
          <div className="mt-4 space-y-4">
            {match.matchedConditions.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-label-1 font-semibold text-emerald-700">
                  <CheckCircle2 className="size-4" /> 충족
                </p>
                <ul className="mt-1.5 space-y-1 text-label-1 text-slate-600">
                  {match.matchedConditions.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
              </div>
            )}
            {match.checkRequiredConditions.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-label-1 font-semibold text-orange-600">
                  <HelpCircle className="size-4" /> 확인 필요
                </p>
                <ul className="mt-1.5 space-y-1 text-label-1 text-slate-600">
                  {match.checkRequiredConditions.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
              </div>
            )}
            {match.missingConditions.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-label-1 font-semibold text-rose-600">
                  <XCircle className="size-4" /> 부족
                </p>
                <ul className="mt-1.5 space-y-1 text-label-1 text-slate-600">
                  {match.missingConditions.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        !hasMatchSignal && (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-brand-blue-50/40 p-6 text-center">
            <p className="text-label-1 text-slate-600">지원금 진단을 받으면 이 제도와 내 조건을 비교해볼 수 있어요.</p>
            <Link
              href="/support"
              className="mt-3 inline-block rounded-lg bg-brand-blue-400 px-4 py-2 text-label-1 font-semibold text-white hover:bg-brand-blue-600"
            >
              지원금 찾기 진단하기
            </Link>
          </div>
        )
      )}

      {recommendedContents.length > 0 && (
        <div className="mt-8 rounded-xl border border-border bg-white p-6">
          <h2 className="text-body-1 font-bold text-slate-900">함께 준비할 수 있는 과정</h2>
          <p className="mt-1 text-label-1 text-slate-400">이 지원제도와 관련된 자격/교육 과정이에요.</p>
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

      <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row">
        <SupportApplyButton
          supportProgramId={program.id}
          sourceUrl={program.sourceUrl ?? program.applyUrl}
          className="h-12 flex-1 bg-brand-blue-400 hover:bg-brand-blue-600"
        />
        <SupportBookmarkButton
          supportProgramId={program.id}
          variant="full"
          isAuthenticated={isAuthenticated}
          initialBookmarked={isBookmarked}
        />
      </div>

      {(program.sourceUrl ?? program.applyUrl) && (
        <p className="mt-3 text-center text-label-2 text-slate-400">
          이 정보는 {program.organizationName ?? program.organization}에서 제공한 내용입니다. 신청 시 공식 페이지로
          이동합니다.
        </p>
      )}
    </div>
  );
}
