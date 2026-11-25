import Link from "next/link";
import { CheckCircle2, ExternalLink, FileText, HelpCircle, XCircle, type LucideIcon } from "lucide-react";
import { PageHead } from "@/components/layout/page-head";
import { isMidlifeRecommended } from "./job-card";
import { cn } from "@/lib/utils";
import { formatSalary } from "@/lib/salary";
import { labelCareerRequirement, labelQualification, labelRegion, labelWorkType } from "@/lib/labels";
import { JobApplyButton } from "./job-apply-button";
import { JobApplicationStatusControl } from "./job-application-status-control";
import { JobBookmarkButton } from "./job-bookmark-button";
import { JobViewTracker } from "./job-view-tracker";
import type { CareerContent, Job, JobApplicationStatus } from "@/types";
import type { JobMatchDetail } from "@/services/job-match.service";
import type { JobRequirementComparisonItem } from "@/services/job-requirement-comparison.service";


/**
 * "이 공고와 내 조건 비교" 묶음.
 * 초록은 갖춘 것, 주황은 공고 원문만으로 판단이 안 되는 것, 빨강은 모자란 것.
 */
/**
 * evaluateJobFit 이 희망 조건과 함께 담는, 공고 요건 성격의 고정 라벨.
 * 아래 "공고가 요구하는 것" 묶음이 필수/우대까지 붙여 더 자세히 보여주므로
 * 위 "희망 근무조건"에서는 뺀다.
 *
 * 요건 이름이 그대로 들어오는 항목은 requirementNames 로 따로 거른다.
 * "경력무관/신입가능" 은 요건 목록에 없어 여기 넣지 않는다 - 빼면 아무 데서도 안 보인다.
 */
const REQUIREMENT_ECHOES = new Set(["운전 가능 여부", "필요 자격"]);

const COMPARISON_GROUPS = [
  {
    key: "fulfilled",
    label: "충족",
    icon: CheckCircle2,
    box: "bg-emerald-50",
    head: "text-emerald-700",
  },
  {
    key: "needsCheck",
    label: "확인 필요",
    icon: HelpCircle,
    box: "bg-orange-50",
    head: "text-orange-600",
  },
  {
    key: "lacking",
    label: "부족",
    icon: XCircle,
    box: "bg-rose-50",
    head: "text-rose-600",
  },
] as const satisfies readonly {
  key: "fulfilled" | "needsCheck" | "lacking";
  label: string;
  icon: LucideIcon;
  box: string;
  head: string;
}[];

/**
 * 요건 행의 상태 표시.
 * 바탕색은 위 "희망 근무조건" 카드와 같은 계열을 쓴다. 회색 바탕에 글자만
 * 색을 넣으면 줄을 하나씩 읽어야 상태를 알 수 있다.
 */

/**
 * 못 갖춘 자격의 준비 경로.
 * 자격 종류(qualifications.type)에 따라 안내처가 다르다.
 * 경험·스킬처럼 자격이 연결되지 않은 요건과 운전면허(OTHER)는 안내하지 않는다.
 */
const QUALIFICATION_PREP_URL: Record<string, string> = {
  NATIONAL_LICENSE: "https://www.hpsedu.co.kr/",
  PRIVATE_CERTIFICATE: "https://www.korhrd.co.kr/",
};

function prepUrlFor(item: JobRequirementComparisonItem): string | undefined {
  // 못 갖춘 것이 확인된 경우에만 권한다. 아직 모르는 자격까지 권하면
  // 이미 가진 사람에게도 "따세요"라고 하는 셈이 된다.
  if (item.userStatus !== "NOT_SATISFIED") return undefined;
  return item.qualificationType ? QUALIFICATION_PREP_URL[item.qualificationType] : undefined;
}

const REQUIREMENT_STATUS_STYLE: Record<
  string,
  { icon: LucideIcon; label: string; className: string; box: string }
> = {
  // 상태 뜻이 있는 색이라 두 파랑으로 바꾸지 않는다. 회색 띠 위라 반투명 대신 꽉 찬 옅은 색.
  SATISFIED: { icon: CheckCircle2, label: "충족", className: "text-emerald-700", box: "bg-emerald-50" },
  NOT_SATISFIED: { icon: XCircle, label: "미충족", className: "text-rose-600", box: "bg-rose-50" },
  CHECK_REQUIRED: { icon: HelpCircle, label: "확인필요", className: "text-orange-600", box: "bg-orange-50" },
  UNKNOWN: { icon: HelpCircle, label: "확인필요", className: "text-orange-600", box: "bg-orange-50" },
};

/** 모집 요강 표의 한 줄. 정부 누리집 공고처럼 왼쪽 회색 칸에 항목 이름, 오른쪽에 값. 값이 없으면("-" 포함) 줄째 뺀다. */
function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value || value === "-") return null;
  return (
    <div className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[8rem_1fr]">
      <dt className="px-4 py-3.5 text-body-3 font-semibold text-slate-600 sm:px-5">{label}</dt>
      <dd className="px-4 py-3.5 text-body-2 font-medium break-keep text-slate-900 sm:px-5">{value}</dd>
    </div>
  );
}

/** 상세 화면의 한 구역: 제목 + 내용. 구역끼리는 간격으로만 나눈다. */
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-title-3 font-extrabold text-slate-900">{title}</h2>
      {description && <p className="mt-1 text-body-3 font-medium text-slate-600">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
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
  applicationStatus = null,
}: {
  job: Job;
  match: JobMatchDetail | null;
  recommendedContents: CareerContent[];
  hasCareerSignal: boolean;
  isAuthenticated?: boolean;
  isBookmarked?: boolean;
  requirementComparison?: JobRequirementComparisonItem[];
  /** 회원이 이 공고에 표시한 지원 상태. 로그인 회원에게만 표시 줄을 그린다. */
  applicationStatus?: JobApplicationStatus | null;
}) {
  const showRequirements = Boolean(isAuthenticated && requirementComparison && requirementComparison.length > 0);

  /*
    "희망 근무조건"에서 요구조건 묶음이 이미 말해주는 항목을 뺀다.
    evaluateJobFit 은 희망 조건(지역·급여·근무형태)과 공고 요건(운전·자격)을 한 배열에
    섞어 담는데, 요건 쪽은 아래 묶음이 필수/우대까지 붙여 더 자세히 보여준다.
  */
  const requirementNames = new Set(requirementComparison?.map((r) => r.requirementName) ?? []);
  const isPreferenceItem = (text: string) =>
    !REQUIREMENT_ECHOES.has(text) && !requirementNames.has(text);

  const preferenceItems = {
    fulfilled: match?.fulfilled.filter(isPreferenceItem) ?? [],
    needsCheck: match?.needsCheck.filter(isPreferenceItem) ?? [],
    lacking: match?.lacking.filter(isPreferenceItem) ?? [],
  };

  // 비어 있지 않은 묶음만. 개수에 따라 열 수가 달라진다.
  const visibleComparisons = COMPARISON_GROUPS.filter((g) => preferenceItems[g.key].length > 0);

  const tags = [
    job.isBeginnerFriendly ? "신입가능" : null,
    isMidlifeRecommended(job) ? "중장년 추천" : null,
    job.externalSource ? `출처 · ${job.externalSource === "work24" ? "고용24" : job.externalSource}` : null,
  ].filter((t): t is string => Boolean(t));

  return (
    // 세부 화면 공통 바탕: 위치 줄과 큰 제목 아래 회색 띠 위에 흰 판(/draft3). 지원 동작은 하단에 고정한다.
    <div className="bg-white">
      <JobViewTracker jobId={job.id} matchScore={match?.score} />
      <PageHead icon="jobs"
        crumbs={[{ label: "일자리 찾기", href: "/jobs" }, { label: "공고 상세" }]}
        title={<span className="text-balance">{job.title}</span>}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>{job.companyName}</span>
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-white px-2.5 py-0.5 text-body-3 font-medium text-slate-700">
                {t}
              </span>
            ))}
          </span>
        }
      />

    <div className="bg-white">
    <div className="mx-auto max-w-6xl px-4.5 pb-10 lg:px-8">
     <div className="max-w-3xl">
      <Section title="모집 요강">
        {/* 테두리 표 대신 흰 판 + 옅은 줄로 나눈다 (/draft3 구성). */}
        <dl className="divide-y divide-slate-100 overflow-hidden rounded-card bg-white shadow-card">
          <InfoRow
            label="근무지역"
            value={job.address ?? job.locationDetail ?? [labelRegion(job.region), job.regionSigungu].filter(Boolean).join(" ")}
          />
          <InfoRow label="급여" value={formatSalary(job)} />
          <InfoRow label="고용형태" value={labelWorkType(job.workType)} />
          <InfoRow label="경력조건" value={labelCareerRequirement(job.careerRequirement)} />
          <InfoRow label="학력" value={job.educationRequirement} />
          <InfoRow label="근무시간" value={[job.workHours, job.workDays].filter(Boolean).join(" · ") || undefined} />
          <InfoRow label="마감일" value={job.applyDeadline ? job.applyDeadline.slice(0, 10) : "상시채용"} />
        </dl>
      </Section>

      {job.preferredQualifications.length > 0 && (
        <Section title="우대·필요 자격">
          <div className="flex flex-wrap gap-2">
            {job.preferredQualifications.map((code) => (
              <span key={code} className="rounded-full bg-white px-3 py-1.5 text-body-3 font-semibold text-baro-blue">
                {labelQualification(code)}
              </span>
            ))}
          </div>
        </Section>
      )}

      <Section title="상세 설명">
        <div className="rounded-card bg-white p-5 shadow-card sm:p-6">
          <p className="text-body-2-reading font-medium whitespace-pre-line text-slate-800">{job.description}</p>
          {job.qualificationRequirements && (
            <p className="mt-3 text-body-3 font-medium whitespace-pre-line text-slate-600">
              필요 자격요건: {job.qualificationRequirements}
            </p>
          )}
        </div>
      </Section>

      {/*
        희망 조건과 공고 요구조건을 한 묶음에 담는다.
        예전에는 두 섹션으로 나뉘어 있었는데 재료가 다를 뿐(프로필 매칭 vs 원문 요건 추출)
        "운전 가능 여부" 같은 항목이 양쪽에 나와 같은 말을 두 번 했다.
      */}
      {(match || showRequirements) && (
        <Section title="이 공고와 내 조건 비교" description="희망하신 근무조건과 공고가 요구하는 조건을 함께 봤어요.">
          {visibleComparisons.length > 0 && match && (
            <div>
              <p className="text-body-3 font-semibold text-slate-700">희망 근무조건</p>
              <div className={cn("mt-2 grid gap-3", visibleComparisons.length > 1 && "sm:grid-cols-2")}>
                {visibleComparisons.map(({ key, label, icon: Icon, box, head }) => (
                  <div key={key} className={cn("rounded-xl p-4", box)}>
                    <p className={cn("flex items-center gap-1.5 text-body-3 font-semibold", head)}>
                      <Icon className="size-4" /> {label}
                    </p>
                    <ul className="mt-2 space-y-1 text-body-3 font-medium text-slate-700">
                      {preferenceItems[key].map((f) => (
                        <li key={f}>· {f}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showRequirements && (
            <div className={cn(visibleComparisons.length > 0 && match && "mt-5")}>
              <p className="text-body-3 font-semibold text-slate-700">공고 요구조건</p>
              <div className="mt-2 space-y-2">
                {requirementComparison!.map((item) => {
                  const style = REQUIREMENT_STATUS_STYLE[item.userStatus] ?? REQUIREMENT_STATUS_STYLE.UNKNOWN;
                  const Icon = style.icon;
                  const prepUrl = prepUrlFor(item);
                  return (
                    <div
                      key={item.requirementId}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl px-4 py-3 text-body-3",
                        style.box,
                      )}
                    >
                      <span className="font-semibold text-slate-800">
                        {item.requirementName}
                        <span className="ml-1.5 text-caption-1 font-medium text-slate-600">
                          {item.jobLevel === "REQUIRED" ? "필수" : item.jobLevel === "PREFERRED" ? "우대" : "언급"}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        {/* 못 갖춘 자격은 취득 경로를 바로 열어준다. 외부 사이트라 새 창으로. */}
                        {prepUrl && (
                          <a
                            href={prepUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-caption-1 font-semibold text-slate-700"
                          >
                            자격 준비하기
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                        <span className={cn("flex items-center gap-1 font-semibold", style.className)}>
                          <Icon className="size-4" />
                          {style.label}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Section>
      )}

      {!match && !hasCareerSignal && (
        <div className="mt-10 flex flex-col items-start gap-3 rounded-card bg-baro-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-body-2 font-semibold break-keep text-slate-800">직업진단을 받으면 이 공고와 내 조건을 비교해볼 수 있어요.</p>
          <Link
            href="/assessment"
            className="inline-flex h-11 shrink-0 items-center rounded-xl bg-atomic-blue-600 px-5 text-body-3 font-bold text-white"
          >
            내게 맞는 직업 찾기
          </Link>
        </div>
      )}

      {recommendedContents.length > 0 && (
        <Section title="이 공고에 필요한 준비" description="이 공고와 관련된 자격/교육 과정이에요.">
          <div className="grid gap-3 sm:grid-cols-2">
            {recommendedContents.map((content) => (
              <div key={content.id} className="rounded-card bg-white p-5 shadow-card">
                <p className="text-body-2 font-semibold text-slate-900">{content.title}</p>
                <p className="mt-1 text-body-3 font-medium text-slate-600">{content.summary ?? content.shortDescription}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Link
        href={`/resume/new?job=${job.id}`}
        className="mt-10 flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-body-2 font-semibold text-slate-800"
      >
        <FileText className="size-4" />이 공고에 맞는 이력서 만들기
      </Link>

      {/*
        지원은 외부 사이트에서 이뤄져 우리가 알 수 없다. 지원하고 돌아온 회원이 여기서 직접 표시하면
        마이페이지 5단계가 완료로 바뀐다. 목록을 늘어놓는 대신 공고마다 이 한 줄이 기록 자리다.
      */}
      {isAuthenticated && (
        <section className="mt-4 flex flex-col gap-3 rounded-card bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <p className="text-body-2 font-semibold text-slate-900">이 공고에 지원하셨나요?</p>
            <p className="mt-0.5 text-body-3 font-medium text-slate-600">표시해 두면 마이페이지 취업 절차에 기록돼요. 면접·취업까지 이어지면 단계를 올려 주세요.</p>
          </div>
          <JobApplicationStatusControl jobId={job.id} status={applicationStatus} />
        </section>
      )}

      {job.sourceUrl && (
        <p className="mt-6 text-center text-body-3 font-medium text-slate-600">
          이 공고는 {job.externalSource === "work24" ? "고용24" : "외부"}에서 제공한 정보입니다. 지원 시 원본 페이지로 이동합니다.
        </p>
      )}

      {/* 하단 고정 CTA가 마지막 내용을 가리지 않도록 비워둔다. */}
      <div className="h-24" />
     </div>
    </div>
    </div>

    {/* ── 하단 고정 CTA ── */}
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4.5 py-3 lg:px-8">
        <div className="flex w-full max-w-3xl items-center gap-3">
        <JobApplyButton jobId={job.id} sourceUrl={job.sourceUrl} className="h-12 flex-1 rounded-xl bg-atomic-blue-600 text-body-1 font-bold" />
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
    </div>
  );
}
