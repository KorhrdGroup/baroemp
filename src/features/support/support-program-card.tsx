import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { REGION_LABELS } from "@/lib/labels";
import type { MatchReasonDetail, SupportEligibilityGrade, SupportProgram } from "@/types";
import { SUPPORT_ELIGIBILITY_GRADE_LABELS } from "@/types";

const GRADE_BADGE_CLASS: Record<SupportEligibilityGrade, string> = {
  HIGH: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEDIUM: "border-brand-blue-200 bg-brand-blue-50 text-brand-blue-700",
  CHECK_REQUIRED: "border-amber-200 bg-amber-50 text-amber-700",
  LOW: "border-slate-200 bg-slate-50 text-slate-500",
};

function regionLabel(program: SupportProgram): string {
  if (!program.regionScope) return "전국";
  if (program.regionScope === "national") return "전국";
  return REGION_LABELS[program.regionScope as keyof typeof REGION_LABELS] ?? program.regionScope;
}

export function SupportProgramCard({
  program,
  grade,
  score,
  reasons,
}: {
  program: SupportProgram;
  grade?: SupportEligibilityGrade;
  score?: number;
  reasons?: MatchReasonDetail[];
}) {
  const topReason = reasons?.[0]?.label;

  return (
    <Link
      href={`/support/${program.id}`}
      className="flex flex-col rounded-xl border border-border bg-white p-5 transition-colors hover:border-brand-blue-300"
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="rounded-full text-label-2 text-slate-500">
          {program.organizationName ?? program.organization}
        </Badge>
        {grade && (
          <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-label-2 font-bold", GRADE_BADGE_CLASS[grade])}>
            {SUPPORT_ELIGIBILITY_GRADE_LABELS[grade]}
            {typeof score === "number" && <span className="ml-1 font-normal opacity-70">{score}점</span>}
          </span>
        )}
      </div>

      <h3 className="mt-3 text-body-1 font-bold text-slate-900">{program.title}</h3>
      <p className="mt-2 line-clamp-2 text-label-1 text-slate-500">
        {program.benefitDescription ?? program.summary}
      </p>

      {topReason && (
        <p className="mt-2 text-label-1 font-medium text-brand-blue-600">✓ {topReason}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-4 text-label-2 text-slate-400">
        <span>지역 · {regionLabel(program)}</span>
        <span>신청기간 · {program.applicationPeriod ?? "상시"}</span>
      </div>
    </Link>
  );
}
