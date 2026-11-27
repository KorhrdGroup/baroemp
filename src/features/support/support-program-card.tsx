import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SupportBookmarkButton } from "./support-bookmark-button";
import { guessRegionFromText, labelOrganization, REGION_LABELS } from "@/lib/labels";
import { resolveOrganizationLogo } from "@/lib/support/organization-logo";
import type { MatchReasonDetail, SupportEligibilityGrade, SupportProgram } from "@/types";
import { SUPPORT_ELIGIBILITY_GRADE_LABELS } from "@/types";
import { GRADE_BADGE_CLASS } from "./grade-badge";

/**
 * 아랫줄에 적을 지역. 새로 알려주는 것이 없으면 비운다.
 *
 * 기관명이 이미 그 지역이면(예: "서울특별시 광진구" - 서울) 같은 말을 두 번 하는 셈이다.
 * 지역을 모르는 제도(regionScope 없음)를 "전국" 이라고 적던 것도 그만둔다 - 모르는 것을
 * 전국이라고 하면, 자기 지역이 아닌 제도를 받을 수 있다고 읽게 된다.
 */
function regionLabel(program: SupportProgram, organization: string): string | undefined {
  if (!program.regionScope) return undefined;
  if (program.regionScope === "national") return "전국";
  const label = REGION_LABELS[program.regionScope as keyof typeof REGION_LABELS] ?? program.regionScope;
  return guessRegionFromText(organization) === program.regionScope ? undefined : label;
}

/* 카드에 쓸 짧은 조건 이름. 판정 문구("거주지역 조건 일치")를 그대로 쓰지 않는다. 여기 없는 근거는 카드에 보이지 않는다. */
const REASON_NAME: Record<string, string> = {
  region_match: "지역",
  employment_status: "취업 상태",
  qualification: "자격",
  job_category: "경력",
  training_willingness: "교육 의향",
  age_range: "나이",
  age_group: "나이",
  region_national: "전국 대상",
};
/* 판정은 늘 연령부터라 그대로 두면 맨 앞이 다 "나이"가 된다. 사람을 더 가르는 조건부터 보인다. */
const REASON_ORDER = Object.keys(REASON_NAME);

/** 맞은 근거 → 조건 이름(겹치는 이름은 한 번만). */
function reasonNames(reasons: MatchReasonDetail[] = []): string[] {
  const names = reasons
    .filter((r) => REASON_NAME[r.ruleKey])
    .sort((a, b) => REASON_ORDER.indexOf(a.ruleKey) - REASON_ORDER.indexOf(b.ruleKey))
    .map((r) => REASON_NAME[r.ruleKey]);
  return names.filter((n, i) => names.indexOf(n) === i);
}

export function SupportProgramCard({
  program,
  grade,
  reasons,
  isAuthenticated = false,
  isBookmarked = false,
}: {
  program: SupportProgram;
  grade?: SupportEligibilityGrade;
  reasons?: MatchReasonDetail[];
  isAuthenticated?: boolean;
  isBookmarked?: boolean;
}) {
  const matchedNames = reasonNames(reasons);
  const organization = program.organizationName ?? program.organization;
  const orgName = labelOrganization(organization);
  const logo = resolveOrganizationLogo(organization);
  const region = regionLabel(program, organization);

  return (
    // 찜 버튼은 카드 Link 안에 넣을 수 없어(버튼 중첩) 형제로 두고 위에 겹친다. 공고 카드와 같다.
    <div className="relative h-full">
    <Link
      href={`/support/${program.id}`}
      /*
        일자리 카드(JobCard)와 같은 틀 · 같은 차례로 둔다: 제목(굵게) → 기관 · 지역 → 맞은 근거 → 아랫줄(등급 · 신청기간 · 찜).
        예전에는 기관 · 등급 알약이 맨 위에 있어 제목이 두 번째 줄로 밀리고, 두 카드가 서로 다른 규칙으로 보였다.
        마우스를 올리면 일자리 카드와 같은 그림자(shadow-hover). /draft3 색 판 안에서는 회색 띠 위의 흰 카드라 테두리를 걷고 모서리 20px.
      */
      className="flex h-full flex-col rounded-2xl border border-border bg-white p-5 transition-shadow duration-200 hover:shadow-hover in-[.draft3-theme]:rounded-card in-[.draft3-theme]:border-0"
    >
      {/*
        break-keep 이 없으면 한글이 음절 단위로 잘린다. 일자리 카드 제목과 같은 규칙.
        제목 아래 두 줄 설명(benefitDescription · summary)은 뺐다 - 원문을 그대로 잘라 붙인 것이라
        "ㅇ … 1. 사업대상 : …"처럼 기호 · 번호가 섞인 채 중간에 끊겨 카드만 복잡해 보였다. 내용은 상세 화면에서 본다.
      */}
      <h3 className="line-clamp-2 text-body-1 leading-[1.4] font-semibold break-keep text-slate-900">{program.title}</h3>

      {/* 기관 · 지역을 한 줄로(일자리 카드의 회사 · 지역 줄). 로고가 있으면 로고, 없으면 이름. 기관 이름이 길면 기관 쪽 끝을 줄인다. */}
      <p className="mt-1 flex min-w-0 items-center gap-1.5 text-body-3 font-medium text-slate-600">
        {logo ? (
          <Image src={logo} alt={orgName} width={80} height={20} className="h-4 w-auto shrink-0 object-contain" />
        ) : (
          <span className="truncate">{orgName}</span>
        )}
        {region && (
          <>
            <span aria-hidden className="size-0.5 shrink-0 rounded-full bg-slate-400" />
            <span className="shrink-0 whitespace-nowrap">{region}</span>
          </>
        )}
      </p>

      {/*
        결과 화면에서 맞은 조건 한 줄: "지역, 교육 의향, 나이 조건이 맞아요". 조건 이름만 조금 진하게.
        칩으로 두면 아래 등급 표시와 모양이 겹쳐 따로 놀아, 다른 카드처럼 글자 줄로 둔다. 길면 한 줄 끝에서 줄인다.
        카드마다 파란 글자가 있으면 목록 전체가 파래져 회색으로 둔다.
      */}
      {matchedNames.length > 0 && (
        <p className="mt-3 truncate text-body-3 font-medium text-slate-600">
          <span className="font-semibold text-slate-800">{matchedNames.join(", ")}</span> 조건이 맞아요
        </p>
      )}

      {/*
        아랫줄: 왼쪽은 적합등급(내부 점수는 회원에게 의미가 없어 라벨만), 오른쪽은 신청기간 → 찜 버튼 순.
        찜 버튼은 링크 밖에 겹쳐 놓아 그 폭(pr-9)만큼 비워 둔다. 일자리 카드의 태그 · 남은 날 줄과 같은 크기.
      */}
      <div className="mt-auto flex items-center gap-2 pt-4 pr-9">
        <div className="flex h-6 min-w-0 flex-1">
          {grade && (
            <span className={cn("flex h-6 items-center rounded px-2 pt-px text-caption-1 font-semibold", GRADE_BADGE_CLASS[grade])}>
              {SUPPORT_ELIGIBILITY_GRADE_LABELS[grade]}
            </span>
          )}
        </div>
        <span className="max-w-[60%] truncate text-caption-1 font-medium text-slate-600">{program.applicationPeriod ?? "상시"}</span>
      </div>
    </Link>
    <SupportBookmarkButton
      supportProgramId={program.id}
      isAuthenticated={isAuthenticated}
      initialBookmarked={isBookmarked}
      className="absolute right-3 bottom-4"
    />
    </div>
  );
}
