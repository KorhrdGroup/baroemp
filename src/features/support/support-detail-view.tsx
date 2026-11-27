import Image from "next/image";
import Link from "next/link";
import { Building2, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { labelEmploymentStatus, labelOrganization, labelRegion } from "@/lib/labels";
import { resolveOrganizationLogo } from "@/lib/support/organization-logo";
import { SUPPORT_CATEGORY_LABELS, SUPPORT_ELIGIBILITY_GRADE_LABELS } from "@/types";
import type { CareerContent, Region, SupportEligibilityGrade, SupportProgram } from "@/types";
import type { SupportMatchDetail } from "@/services/support-eligibility.service";
import { SupportApplyButton } from "./support-apply-button";
import { SupportBookmarkButton } from "./support-bookmark-button";
import { SupportViewTracker } from "./support-view-tracker";
import { SupportLongText } from "./support-long-text";
import { PageHead } from "@/components/layout/page-head";

import { GRADE_BADGE_CLASS } from "./grade-badge";

/** 지원 요강 표의 한 줄. 정부 누리집 공고처럼 왼쪽 회색 칸에 항목 이름, 오른쪽에 값. 공고 상세와 같은 표. */
/**
 * 공공데이터 원문의 구분 기호를 읽기 좋게 바꾼다.
 * "방문신청||직접입력" → "방문신청 · 직접입력", "청년정책팀/041-950-4542" → "청년정책팀 · 041-950-4542".
 */
function tidySourceText(value: string): string {
  return value
    .replace(/\s*\|\|\s*/g, " · ")
    .replace(/\s*\/\s*(?=\d{2,4}-\d{3,4}-\d{4})/g, " · ");
}

function InfoRow({ label, value: rawValue, clamp = true }: { label: string; value?: string; clamp?: boolean }) {
  if (!rawValue) return null;
  const value = tidySourceText(rawValue);
  return (
    <div className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[8rem_1fr]">
      <dt className="px-4 py-3.5 text-body-3 font-semibold text-slate-600 sm:px-5">{label}</dt>
      {/* 실 API는 짧은 사실 필드에도 안내문 전체를 담아 보내는 경우가 있어 길이를 제한한다. */}
      {/* 줄 수 제한은 안쪽 span 에 건다. dd 에 직접 걸면 아래 여백 자리로 넷째 줄이 반쯤 비쳐 보인다. */}
      <dd className="px-4 py-3.5 text-body-2 font-medium break-keep text-slate-900 sm:px-5">
        <span className={cn(clamp && "line-clamp-3")}>{value}</span>
      </dd>
    </div>
  );
}

/** 상세 화면의 한 구역: 제목 + 내용. 구역끼리는 간격으로만 나눈다. */
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-title-3 font-bold text-slate-900">{title}</h2>
      {description && <p className="mt-1 text-body-3 font-medium text-slate-600">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
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
  const organization = program.organizationName ?? program.organization;
  const orgName = labelOrganization(organization);
  const logo = resolveOrganizationLogo(organization);
  const regionText =
    program.regionScope === "national" || !program.regionScope ? "전국" : labelRegion(program.regionScope as Region);

  /* 지원대상 원문이 요강의 지원대상과 같은 글이고 짧으면(120자 이하) 한 번만, 자르지 않고 보여 준다. */
  const shortSameTarget =
    !!program.eligibilityRaw &&
    program.eligibilityRaw.trim() === program.targetDescription?.trim() &&
    program.eligibilityRaw.length <= 120;

  return (
    // 세부 화면 공통 바탕: 흰 머리 아래 옅은 회색 바탕에 흰 카드(테두리 · 그림자 없음). 신청 동작은 하단에 고정한다. 공고 상세와 같은 틀.
    // /draft3 색 구성 (globals.css .draft3-theme)
    <div className="draft3-theme bg-white">
      <SupportViewTracker supportProgramId={program.id} matchScore={match?.score} eligibilityGrade={match?.grade} />
      <PageHead icon="support"
        crumbs={[{ label: "지원금 찾기", href: "/support" }, { label: "지원제도 상세" }]}
        title={<span className="text-balance">{program.title}</span>}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {logo ? (
              <Image src={logo} alt={orgName} width={100} height={24} className="h-6 w-auto object-contain" />
            ) : (
              <span className="flex items-center gap-1.5">
                <Building2 className="size-4 text-slate-600" />
                {orgName}
              </span>
            )}
            {program.departmentName && <span>{program.departmentName}</span>}
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-body-3 font-medium text-slate-700">
              {SUPPORT_CATEGORY_LABELS[program.category] ?? program.category}
            </span>
            {/* 목록 카드와 같은 이유로 내부 매칭 점수는 숨기고 등급 라벨만 보여준다. */}
            {match && (
              <span className={cn("rounded-full px-2.5 py-0.5 text-body-3 font-semibold", GRADE_BADGE_CLASS[match.grade])}>
                {SUPPORT_ELIGIBILITY_GRADE_LABELS[match.grade]}
              </span>
            )}
          </span>
        }
      />

    <div className="bg-baro-page">
    {/* 넓은 화면은 2단: 왼쪽 본문, 오른쪽에 따라 내려오는 요약 카드(신청 · 찜 단추 포함). 공고 상세와 같은 틀. */}
    <div className="mx-auto max-w-7xl px-4.5 pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:items-start lg:gap-8 lg:px-8">
     <div className="max-w-3xl lg:max-w-none">
      <Section title="지원 요강">
        <dl className="divide-y divide-slate-100 overflow-hidden rounded-card bg-white">
          <InfoRow label="지원대상" value={targetSummary(program)} clamp={!shortSameTarget} />
          <InfoRow label="지역" value={regionText} />
          <InfoRow label="지원내용" value={benefitSummary(program)} />
          <InfoRow label="신청기간" value={program.applicationPeriod ?? "상시"} />
          <InfoRow label="신청방법" value={program.applicationMethod} />
          <InfoRow label="문의처" value={program.contact} />
        </dl>
      </Section>

      {program.requiredDocuments && program.requiredDocuments.length > 0 && (
        <Section title="필요서류">
          <div className="flex flex-wrap gap-2">
            {program.requiredDocuments.map((doc) => (
              <span key={doc} className="rounded-full bg-white px-3 py-1.5 text-body-3 font-medium text-slate-700">
                {doc}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* ── 내 조건과 비교 ── */}
      {match ? (
        <Section title="내 조건과 비교" description="입력하신 조건 기준의 참고 정보예요. 최종 신청 가능 여부는 운영기관에서 확인해야 해요.">
          {/* 흰 판에 담는다. 연한 초록 · 주황 · 분홍 상자가 회색 바탕에 바로 놓이면 밝기가 비슷해 흐려 보였다(공고 상세와 같은 이유). */}
          {/* 비어 있는 묶음은 빼므로 칸 수를 실제 묶음 수에 맞춘다. 늘 세 칸이면 두 묶음일 때 오른쪽 한 칸이 비었다. */}
          <div
            className={cn(
              "grid grid-cols-1 gap-3 rounded-card bg-white p-5 sm:p-6",
              {
                2: "sm:grid-cols-2",
                3: "sm:grid-cols-3",
              }[[match.matchedConditions, match.checkRequiredConditions, match.missingConditions].filter((g) => g.length > 0).length],
            )}
          >
            {match.matchedConditions.length > 0 && (
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="flex items-center gap-1.5 text-body-3 font-semibold text-emerald-700">
                  <CheckCircle2 className="size-4" /> 충족
                </p>
                <ul className="mt-2 space-y-1 text-body-3 font-medium text-slate-700">
                  {match.matchedConditions.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
              </div>
            )}
            {match.checkRequiredConditions.length > 0 && (
              <div className="rounded-xl bg-orange-50 p-4">
                <p className="flex items-center gap-1.5 text-body-3 font-semibold text-orange-600">
                  <HelpCircle className="size-4" /> 확인 필요
                </p>
                <ul className="mt-2 space-y-1 text-body-3 font-medium text-slate-700">
                  {match.checkRequiredConditions.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
              </div>
            )}
            {match.missingConditions.length > 0 && (
              <div className="rounded-xl bg-rose-50 p-4">
                <p className="flex items-center gap-1.5 text-body-3 font-semibold text-rose-600">
                  <XCircle className="size-4" /> 부족
                </p>
                <ul className="mt-2 space-y-1 text-body-3 font-medium text-slate-700">
                  {match.missingConditions.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      ) : (
        !hasMatchSignal && (
          <div className="mt-10 flex flex-col items-start gap-3 rounded-card bg-baro-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <p className="text-body-2 font-semibold break-keep text-slate-800">지원금 진단을 받으면 이 제도와 내 조건을 비교해볼 수 있어요.</p>
            <Link
              href="/support"
              className="inline-flex h-12 shrink-0 items-center rounded-xl bg-atomic-blue-600 px-5 text-body-2 font-semibold text-white"
            >
              지원금 찾기 진단하기
            </Link>
          </div>
        )
      )}

      {/* ── 사업 상세 ── */}
      {(program.description || program.eligibilityRaw) && (
        <Section title="사업 상세">
          <div className="rounded-card bg-white p-5 sm:p-6">
            {program.description && (
              <SupportLongText text={program.description} className="text-body-2-reading font-medium text-slate-800" />
            )}
            {/* 위 요강의 지원대상과 같은 짧은 글이면 되풀이하지 않는다. 그때는 요강 줄을 자르지 않고 다 보여 준다. */}
            {program.eligibilityRaw && !shortSameTarget && (
              <div className={cn("rounded-xl bg-gov-surface p-4", program.description && "mt-4")}>
                <p className="mb-1 text-body-3 font-semibold text-slate-600">지원대상 원문</p>
                <SupportLongText text={program.eligibilityRaw} className="text-body-3 font-medium text-slate-700" />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── 함께 준비할 수 있는 과정 ── */}
      {recommendedContents.length > 0 && (
        <Section title="함께 준비할 수 있는 과정" description="이 지원제도와 관련된 자격/교육 과정이에요.">
          <div className="grid gap-3 sm:grid-cols-2">
            {recommendedContents.map((content) => (
              <div key={content.id} className="rounded-card bg-white p-5">
                <p className="text-body-2 font-semibold text-slate-900">{content.title}</p>
                <p className="mt-1 text-body-3 font-medium break-keep text-slate-600">{content.summary ?? content.shortDescription}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {(program.sourceUrl ?? program.applyUrl) && (
        <p className="mt-10 text-center text-body-3 font-medium break-keep text-slate-600">
          이 정보는 {orgName}에서 제공한 내용이에요. 신청하면 공식 페이지로 이동해요.
        </p>
      )}

      {/* 하단 고정 CTA가 마지막 내용을 가리지 않도록 비워둔다. 넓은 화면은 CTA가 오른쪽 카드에 있어 필요 없다. */}
      <div className="h-24 lg:hidden" />
     </div>

     {/* ── 넓은 화면 오른쪽 요약 카드: 첫 구역 제목 높이에서 시작해 화면을 내려도 따라온다. ── */}
     <aside className="sticky top-24 mt-10 hidden lg:block">
      <div className="rounded-card bg-white p-6">
        {program.supportAmountText && (
          <div className="mb-5">
            <p className="text-body-3 font-semibold text-slate-600">지원 내용</p>
            <p className="mt-1 line-clamp-3 text-title-3 font-bold break-keep text-slate-900">{program.supportAmountText}</p>
          </div>
        )}
        <dl className="space-y-3 text-body-3">
          {[
            ["신청기간", program.applicationPeriod ?? "상시"],
            ["지역", regionText],
            ["분류", SUPPORT_CATEGORY_LABELS[program.category] ?? program.category],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="shrink-0 font-semibold text-slate-600">{label}</dt>
              <dd className="line-clamp-2 text-right font-semibold break-keep text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-col gap-2">
          <SupportApplyButton
            supportProgramId={program.id}
            sourceUrl={program.sourceUrl ?? program.applyUrl}
            className="h-12 w-full rounded-xl bg-atomic-blue-600 text-body-1 font-semibold"
          />
          <SupportBookmarkButton
            supportProgramId={program.id}
            variant="full"
            isAuthenticated={isAuthenticated}
            initialBookmarked={isBookmarked}
            className="h-12 w-full rounded-xl text-body-2"
          />
        </div>
      </div>
     </aside>
    </div>
    </div>

    {/* ── 하단 고정 CTA (좁은 화면) ── */}
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white lg:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4.5 py-3 lg:px-8">
        <div className="flex w-full max-w-3xl items-center gap-3">
        <SupportApplyButton
          supportProgramId={program.id}
          sourceUrl={program.sourceUrl ?? program.applyUrl}
          className="h-12 min-w-0 flex-1 rounded-xl bg-atomic-blue-600 px-3 text-body-2 font-semibold sm:px-4 sm:text-body-1"
        />
        <SupportBookmarkButton
          supportProgramId={program.id}
          variant="full"
          isAuthenticated={isAuthenticated}
          initialBookmarked={isBookmarked}
        />
        </div>
      </div>
    </div>
    </div>
  );
}
