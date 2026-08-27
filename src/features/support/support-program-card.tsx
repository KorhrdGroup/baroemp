import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { REGION_LABELS } from "@/lib/labels";
import type { MatchReasonDetail, SupportEligibilityGrade, SupportProgram } from "@/types";
import { SUPPORT_ELIGIBILITY_GRADE_LABELS } from "@/types";

const ORG_LOGO: Record<string, { src: string; w: number; h: number }> = {
  고용노동부: { src: "/ministry-logo/고용노동부.svg", w: 80, h: 20 },
  여성가족부: { src: "/ministry-logo/여성가족부-black.svg", w: 80, h: 20 },
  "서울시 일자리희망센터": { src: "/ministry-logo/서울특별시_CI_좌우조합_서울특별시.png", w: 80, h: 20 },
};

const GRADE_BADGE_CLASS: Record<SupportEligibilityGrade, string> = {
  HIGH: "bg-emerald-50 text-emerald-700",
  MEDIUM: "bg-brand-blue-50 text-brand-blue-700",
  CHECK_REQUIRED: "bg-orange-50 text-orange-700",
  LOW: "bg-slate-100 text-slate-500",
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
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl bg-white",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-5 pt-5">
        {(() => {
          const orgName = program.organizationName ?? program.organization;
          const logo = ORG_LOGO[orgName];
          return logo ? (
            <Image src={logo.src} alt={orgName} width={logo.w} height={logo.h} className="h-5 w-auto object-contain" />
          ) : (
            <Badge variant="outline" className="rounded-full text-label-2 text-slate-500">
              {orgName}
            </Badge>
          );
        })()}
        {grade && (
          <span className={cn("shrink-0 rounded-full px-3 py-1.5 text-label-1 font-bold", GRADE_BADGE_CLASS[grade])}>
            {SUPPORT_ELIGIBILITY_GRADE_LABELS[grade]}
            {typeof score === "number" && <span className="ml-1 font-medium opacity-70">{score}점</span>}
          </span>
        )}
      </div>

      <h3 className="mt-3 px-5 text-body-1 font-bold text-slate-900 group-hover:underline">{program.title}</h3>
      <p className="mt-2 px-5 line-clamp-2 text-label-1 text-slate-600">
        {program.benefitDescription ?? program.summary}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 px-5 pb-5 pt-4 text-label-2 text-slate-500">
        {topReason && (
          <>
            <span>✓ {topReason}</span>
            <span aria-hidden>|</span>
          </>
        )}
        <span>{regionLabel(program)}</span>
        <span aria-hidden>|</span>
        <span>{program.applicationPeriod ?? "상시"}</span>
      </div>
    </Link>
  );
}
