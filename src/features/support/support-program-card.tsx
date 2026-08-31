import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { interactiveCardClass } from "@/lib/ui-classes";
import { SupportBookmarkButton } from "./support-bookmark-button";
import { labelOrganization, REGION_LABELS } from "@/lib/labels";
import { resolveOrganizationLogo } from "@/lib/support/organization-logo";
import type { MatchReasonDetail, SupportEligibilityGrade, SupportProgram } from "@/types";
import { SUPPORT_ELIGIBILITY_GRADE_LABELS } from "@/types";

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
  isAuthenticated = false,
  isBookmarked = false,
}: {
  program: SupportProgram;
  grade?: SupportEligibilityGrade;
  score?: number;
  reasons?: MatchReasonDetail[];
  isAuthenticated?: boolean;
  isBookmarked?: boolean;
}) {
  const topReason = reasons?.[0]?.label;

  return (
    // 찜 버튼은 카드 Link 안에 넣을 수 없어(버튼 중첩) 형제로 두고 위에 겹친다. 공고 카드와 같다.
    <div className="relative h-full">
    <Link
      href={`/support/${program.id}`}
      /*
        일자리 카드(JobCard)와 같은 틀로 맞춘다. 테두리가 없으면 흰 바탕 위에서
        카드로 안 읽히고, h-full 이 없으면 한 줄에 나란히 선 카드끼리 키가 어긋난다.
      */
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white",
        interactiveCardClass,
      )}
    >
      {/*
        오른쪽 끝은 겹쳐 놓은 찜 버튼 자리다. pr-14 로 비워 두지 않으면 적합등급 배지가
        버튼 밑으로 들어간다. 기관 로고 - 등급 배지 - (빈자리) 순으로 선다.
      */}
      <div className="flex items-center justify-between gap-2 px-5 pt-5 pr-14">
        {(() => {
          const organization = program.organizationName ?? program.organization;
          const orgName = labelOrganization(organization);
          const logo = resolveOrganizationLogo(organization);
          return logo ? (
            <Image src={logo} alt={orgName} width={80} height={20} className="h-5 w-auto object-contain" />
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

      {/* break-keep 이 없으면 한글이 음절 단위로 잘린다. 일자리 카드 제목과 같은 규칙. */}
      <h3 className="mt-3 line-clamp-2 break-keep px-5 text-balance text-body-1 leading-[1.4] font-bold text-slate-900 group-hover:underline">
        {program.title}
      </h3>
      <p className="mt-2 px-5 line-clamp-2 text-label-1 text-slate-600">
        {program.benefitDescription ?? program.summary}
      </p>

      {/* 맨 아랫줄 글자는 일자리 카드와 같게 둔다(label-1 medium). 같은 성격의 줄이 크기가 다르면 두 카드가 다른 규칙으로 보인다. */}
      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 px-5 pt-4 pb-5 text-label-1 font-medium text-slate-500">
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

    {/*
      머리줄 배지와 세로 가운데를 맞춘다. 카드 위 여백이 20px(pt-5)이고 버튼이 32px 라
      top-5 로 두면 버튼 가운데(36px)가 적합등급 배지 가운데와 같은 자리에 온다.
      top-3.5 로 두면 4px 떠서 배지와 짝지어 보이지 않는다.
    */}
    <SupportBookmarkButton
      supportProgramId={program.id}
      isAuthenticated={isAuthenticated}
      initialBookmarked={isBookmarked}
      className="absolute right-4 top-5"
    />
    </div>
  );
}
