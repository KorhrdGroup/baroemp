"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock, Coins, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { IntroHero } from "@/components/common/intro-hero";
import { cn } from "@/lib/utils";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import { AGE_GROUP_LABELS, EMPLOYMENT_STATUS_LABELS, DESIRED_START_TIMING_LABELS, REGION_LABELS } from "@/lib/labels";
import { getSupportAssessmentPrefillAction, submitSupportAssessmentAction } from "./support-actions";
import type { AgeGroup, DesiredStartTiming, EmploymentStatus, Region, SupportAssessmentAnswers } from "@/types";

const AGE_GROUP_OPTIONS = Object.entries(AGE_GROUP_LABELS) as [AgeGroup, string][];
void AGE_GROUP_OPTIONS; // birthYear 단계로 대체됨 - 라벨 상수는 다른 화면에서 계속 사용

/** 출생연도 → 연령대 파생. 매칭 로직은 birthYear(만 나이)를 우선 사용하고 ageGroup은 분석/호환용이다. */
function birthYearToAgeGroup(birthYear: number, thisYear: number): AgeGroup {
  const age = thisYear - birthYear;
  if (age < 30) return "20s";
  if (age < 40) return "30s";
  if (age < 50) return "40s";
  if (age < 60) return "50s";
  if (age < 70) return "60s";
  return "70plus";
}
const REGION_OPTIONS = Object.entries(REGION_LABELS) as [Region, string][];
const EMPLOYMENT_STATUS_OPTIONS: [EmploymentStatus, string][] = [
  ["employed", EMPLOYMENT_STATUS_LABELS.employed],
  ["unemployed", EMPLOYMENT_STATUS_LABELS.unemployed],
  ["career_break", EMPLOYMENT_STATUS_LABELS.career_break],
  ["preparing_retirement", EMPLOYMENT_STATUS_LABELS.preparing_retirement],
  ["retired_seeking", EMPLOYMENT_STATUS_LABELS.retired_seeking],
];
const DESIRED_START_TIMING_OPTIONS = Object.entries(DESIRED_START_TIMING_LABELS) as [DesiredStartTiming, string][];

const JOB_CATEGORY_OPTIONS: { code: string; label: string }[] = [
  { code: "care_worker", label: "요양보호·돌봄" },
  { code: "social_worker", label: "사회복지" },
  { code: "hospital_companion", label: "병원동행·간병" },
  { code: "education", label: "교육·보육·강사" },
  { code: "counselor", label: "상담 (심리·직업)" },
  { code: "office_admin", label: "사무·행정" },
  { code: "customer_service", label: "고객센터·콜센터" },
  { code: "retail_sales", label: "매장판매·서비스" },
  { code: "cook", label: "조리·급식" },
  { code: "beauty", label: "미용·뷰티" },
  { code: "security", label: "경비·보안" },
  { code: "facility_cleaning", label: "시설관리·미화" },
  { code: "logistics_driver", label: "배송·운전" },
  { code: "production", label: "생산·제조" },
  { code: "it", label: "IT·컴퓨터" },
  { code: "other", label: "기타 / 잘 모르겠어요" },
];

const TRAINING_WILLINGNESS_LABELS: Record<number, string> = {
  1: "전혀 없음",
  2: "낮음",
  3: "보통",
  4: "높음",
  5: "매우 높음",
};

type StepId =
  | "ageGroup"
  | "birthYear"
  | "householdTraits"
  | "employmentInsuranceHistory"
  | "incomeBand"
  | "region"
  | "employmentStatus"
  | "desiredStartTiming"
  | "trainingWillingness"
  | "careerBreak"
  | "openToGovSupport";

interface StepConfig {
  id: StepId;
  group: GroupKey;
  title: string;
  description?: string;
  required: boolean;
}

type GroupKey = "basic" | "status" | "intent";

const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "basic", label: "기본 정보" },
  { key: "status", label: "취업 현황" },
  { key: "intent", label: "교육·지원 의향" },
];

const STEPS: StepConfig[] = [
  { id: "birthYear", group: "basic", title: "출생연도를 알려주세요", description: "연령 조건이 있는 제도를 정확히 찾아드리기 위해 필요해요.", required: true },
  { id: "region", group: "basic", title: "거주지역이 어디인가요?", required: true },
  {
    id: "householdTraits",
    group: "basic",
    title: "해당되는 항목이 있나요?",
    description: "우선지원 대상 제도를 안내하는 데만 사용돼요. 여러 개를 고를 수 있어요.",
    required: true,
  },
  { id: "employmentStatus", group: "status", title: "현재 취업 상태는 어떤가요?", required: true },
  {
    id: "employmentInsuranceHistory",
    group: "status",
    title: "최근 3년 안에 고용보험에 가입된 적이 있나요?",
    description: "실업급여·국민취업지원제도 등 받을 수 있는 제도 유형이 달라져요.",
    required: true,
  },
  {
    id: "incomeBand",
    group: "status",
    title: "가구 소득 수준을 대략 선택해주세요",
    description: "정확하지 않아도 괜찮아요. 소득 조건이 있는 제도는 \"확인 필요\"로 안내해 드려요.",
    required: true,
  },
  { id: "desiredStartTiming", group: "status", title: "취업 희망 시기는 언제인가요?", required: true },
  { id: "careerBreak", group: "status", title: "경력단절 기간이 있나요?", required: true },
  {
    id: "trainingWillingness",
    group: "intent",
    title: "직업훈련·교육에 참여할 의향이 있나요?",
    description: "훈련 지원 제도를 안내하는 데 활용돼요.",
    required: true,
  },
  {
    id: "openToGovSupport",
    group: "intent",
    title: "정부·지자체 지원제도를 활용할 의향이 있나요?",
    description: "참고용 정보로만 활용되며 매칭 점수에는 직접 반영되지 않아요.",
    required: true,
  },
];

function isStepFilled(step: StepConfig, answers: SupportAssessmentAnswers): boolean {
  if (!step.required) return true;
  switch (step.id) {
    case "birthYear":
      return Boolean(answers.birthYear);
    case "region":
      return Boolean(answers.region);
    case "householdTraits":
      // 해당 항목이 없는 사람은 "해당사항 없어요"(["none"])로 답한다.
      return (answers.householdTraits?.length ?? 0) > 0;
    case "openToGovSupport":
      return answers.openToGovSupport !== undefined;
    case "employmentStatus":
      return Boolean(answers.employmentStatus);
    case "employmentInsuranceHistory":
      return Boolean(answers.employmentInsuranceHistory);
    case "incomeBand":
      return Boolean(answers.incomeBand);
    case "desiredStartTiming":
      return Boolean(answers.desiredStartTiming);
    case "careerBreak":
      return answers.careerBreak !== undefined;
    case "trainingWillingness":
      return typeof answers.trainingWillingness === "number";
    default:
      return true;
  }
}

function ChipButton({
  selected,
  onClick,
  indicator = "none",
  disabled = false,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  indicator?: "none" | "radio" | "check";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex min-h-14 items-center justify-center rounded-xl border bg-white py-3.5 text-center text-body-2 font-medium transition-colors",
        indicator === "none" ? "px-4" : "px-11",
        selected
          ? "border-brand-blue-200 bg-brand-blue-50 text-brand-blue-700"
          : "border-border text-slate-700 hover:border-brand-blue-300 hover:bg-brand-blue-50/50",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {indicator === "radio" && (
        <span
          className={cn(
            "absolute left-4 flex size-5 items-center justify-center rounded-full border-2 transition-colors",
            selected ? "border-brand-blue-400" : "border-slate-300",
          )}
        >
          {selected && <span className="size-2.5 rounded-full bg-brand-blue-400" />}
        </span>
      )}
      {indicator === "check" && (
        <span
          className={cn(
            "absolute left-4 flex size-5 items-center justify-center rounded-sm border-2 transition-colors",
            selected ? "border-brand-blue-400 bg-brand-blue-400 text-white" : "border-slate-300",
          )}
        >
          {selected && <Check className="size-3.5" />}
        </span>
      )}
      {children}
    </button>
  );
}

function StepBody({
  step,
  answers,
  onChange,
}: {
  step: StepConfig;
  answers: SupportAssessmentAnswers;
  onChange: (patch: Partial<SupportAssessmentAnswers>) => void;
}) {
  switch (step.id) {
    case "birthYear": {
      const thisYear = new Date().getFullYear();
      const years = Array.from({ length: thisYear - 18 - 1945 + 1 }, (_, i) => thisYear - 18 - i);
      return (
        <div className="flex flex-col items-center gap-3">
          {/* 연도는 80개 가까이 된다. OS 피커(아래에서 올라오는 휠)가 목록을 훑는 것보다 빠르다. */}
          <div className="w-56">
            <NativeSelect
              className="h-14 rounded-xl border-border bg-white text-body-1 font-semibold text-slate-800"
              value={answers.birthYear ? String(answers.birthYear) : ""}
              onChange={(e) => {
                if (!e.target.value) return;
                const birthYear = Number(e.target.value);
                onChange({ birthYear, ageGroup: birthYearToAgeGroup(birthYear, thisYear) });
              }}
            >
              <option value="">연도 선택</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}년생
                </option>
              ))}
            </NativeSelect>
          </div>
          {answers.birthYear && (
            <p className="text-label-1 text-slate-500">
              만 {new Date().getFullYear() - answers.birthYear}세 기준으로 연령 조건을 확인해 드려요.
            </p>
          )}
        </div>
      );
    }
    case "employmentInsuranceHistory":
      return (
        <div className="flex flex-col gap-2">
          {(
            [
              ["yes", "네, 다닌 적 있어요"],
              ["no", "아니요, 없어요"],
              ["unknown", "잘 모르겠어요"],
            ] as const
          ).map(([code, label]) => (
            <ChipButton
              indicator="radio"
              key={code}
              selected={answers.employmentInsuranceHistory === code}
              onClick={() => onChange({ employmentInsuranceHistory: code })}
            >
              {label}
            </ChipButton>
          ))}
        </div>
      );
    case "incomeBand":
      return (
        <div className="flex flex-col gap-2">
          {(
            [
              ["low", "낮은 편이에요"],
              ["middle", "보통이에요"],
              ["high", "높은 편이에요"],
              ["unknown", "잘 모르겠어요"],
            ] as const
          ).map(([code, label]) => (
            <ChipButton
              indicator="radio"
              key={code}
              selected={answers.incomeBand === code}
              onClick={() => onChange({ incomeBand: code })}
            >
              {label}
            </ChipButton>
          ))}
        </div>
      );
    case "householdTraits": {
      const current = answers.householdTraits ?? [];
      const noneSelected = current.length === 1 && current[0] === "none";
      const toggle = (code: string) =>
        onChange({
          householdTraits: current.includes(code) ? current.filter((c) => c !== code) : [...current.filter((c) => c !== "none"), code],
        });
      return (
        <div className="flex flex-col gap-2">
          {(
            [
              ["single_parent", "한부모 가정이에요"],
              ["disability", "본인 또는 가족에게 장애가 있어요"],
              ["basic_livelihood", "기초생활수급·차상위 가구예요"],
              ["veteran", "국가유공자·보훈 대상이에요"],
            ] as const
          ).map(([code, label]) => (
            <ChipButton
              indicator="check"
              key={code}
              disabled={noneSelected}
              selected={current.includes(code)}
              onClick={() => toggle(code)}
            >
              {label}
            </ChipButton>
          ))}
          {/* 위 항목들과 성격이 다른 배타 선택지라 박스 밖으로 분리하되, 라디오 표시는 남긴다. */}
          <button
            type="button"
            onClick={() => onChange({ householdTraits: noneSelected ? [] : ["none"] })}
            className={cn(
              "mt-2 flex items-center justify-center gap-2 self-center rounded-lg px-3 py-2 text-body-2 font-medium transition-colors",
              noneSelected ? "text-brand-blue-700" : "text-slate-500 hover:text-slate-700",
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                noneSelected ? "border-brand-blue-400" : "border-slate-300",
              )}
            >
              {noneSelected && <span className="size-2.5 rounded-full bg-brand-blue-400" />}
            </span>
            해당사항 없어요
          </button>
        </div>
      );
    }
    case "region":
      return (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {REGION_OPTIONS.map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => onChange({ region: code })}
              className={cn(
                "min-h-12 rounded-xl border px-3 py-3 text-body-2 font-medium transition-colors",
                answers.region === code
                  ? "border-brand-blue-200 bg-brand-blue-50 text-brand-blue-700"
                  : "border-border text-slate-700 hover:border-brand-blue-300 hover:bg-brand-blue-50/50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      );
    case "employmentStatus":
      return (
        <div className="flex flex-col gap-2">
          {EMPLOYMENT_STATUS_OPTIONS.map(([code, label]) => (
            <div key={code} className="flex flex-col">
              <ChipButton indicator="radio"
                selected={answers.employmentStatus === code}
                onClick={() => onChange({ employmentStatus: code, ...(code !== "employed" && { currentJobCategory: undefined }) })}
              >
                {label}
              </ChipButton>
              {code === "employed" && answers.employmentStatus === "employed" && (
                <div className="mt-1.5">
                  <div className="rounded-xl bg-slate-50/60 px-2.5 pb-2.5 pt-3">
                    <p className="mb-3 text-center text-body-2 font-medium text-slate-500">어떤 직종에서 일하고 계신가요? <span className="text-slate-400">(선택)</span></p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {JOB_CATEGORY_OPTIONS.map((opt) => (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => onChange({ currentJobCategory: opt.code })}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-label-1 font-medium transition-colors",
                            answers.currentJobCategory === opt.code
                              ? "border-brand-blue-400 bg-brand-blue-50 text-brand-blue-600"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    case "desiredStartTiming":
      return (
        <div className="flex flex-col gap-2">
          {DESIRED_START_TIMING_OPTIONS.map(([code, label]) => (
            <ChipButton indicator="radio"
              key={code}
              selected={answers.desiredStartTiming === code}
              onClick={() => onChange({ desiredStartTiming: code })}
            >
              {label}
            </ChipButton>
          ))}
        </div>
      );
    case "trainingWillingness":
      return (
        <div>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange({ trainingWillingness: n })}
                className={cn(
                  "flex aspect-square min-h-14 flex-col items-center justify-center rounded-xl border text-body-1 font-bold transition-colors",
                  answers.trainingWillingness === n
                    ? "border-brand-blue-400 bg-brand-blue-400 text-white"
                    : "border-border text-slate-700 hover:border-brand-blue-300 hover:bg-brand-blue-50/50",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-label-1 text-slate-400">
            <span>{TRAINING_WILLINGNESS_LABELS[1]}</span>
            <span>{TRAINING_WILLINGNESS_LABELS[5]}</span>
          </div>
        </div>
      );
    case "careerBreak":
      return (
        <div className="flex flex-col gap-4">
          {/* 2지선다도 다른 단계처럼 폭을 꽉 채워야 질문과 같은 중심선에 놓인다. */}
          <div className="grid grid-cols-2 gap-3">
            <ChipButton indicator="radio" selected={answers.careerBreak === true} onClick={() => onChange({ careerBreak: true })}>
              있어요
            </ChipButton>
            <ChipButton indicator="radio"
              selected={answers.careerBreak === false}
              onClick={() => onChange({ careerBreak: false, careerBreakMonths: undefined })}
            >
              없어요
            </ChipButton>
          </div>
          {answers.careerBreak && (
            /* 폭을 채울 수 없는 입력 줄이라 가운데로 모은다. */
            <div className="flex items-center justify-center gap-3">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={answers.careerBreakMonths ?? ""}
                onChange={(e) =>
                  onChange({ careerBreakMonths: e.target.value === "" ? undefined : Number(e.target.value) })
                }
                className="h-14 w-40 rounded-xl border border-border px-4 text-body-1 font-semibold text-slate-800 focus:border-brand-blue-400 focus:outline-none"
                placeholder="0"
              />
              <span className="text-body-2 text-slate-500">개월 정도</span>
            </div>
          )}
        </div>
      );
    case "openToGovSupport":
      return (
        <div className="flex flex-col gap-2">
          <ChipButton indicator="radio" selected={answers.openToGovSupport === true} onClick={() => onChange({ openToGovSupport: true })}>
            네, 적극 활용하고 싶어요
          </ChipButton>
          <ChipButton indicator="radio" selected={answers.openToGovSupport === false} onClick={() => onChange({ openToGovSupport: false })}>
            아니요, 참고만 할게요
          </ChipButton>
        </div>
      );
    default:
      return null;
  }
}

const INFO_ITEMS = [
  { icon: Clock, label: "약 2~3분" },
  { icon: Sparkles, label: "결과 즉시 확인" },
];

const RESULT_ITEMS = ["받을 수 있는 취업·훈련 지원금", "생활·지역 지원제도", "지원 가능성 등급", "신청 방법과 서류"];

function SupportIntro({
  onStart,
  loading,
  latestResultSessionId,
}: {
  onStart: () => void;
  loading: boolean;
  latestResultSessionId?: string;
}) {
  return (
    <IntroHero
      icon={Coins}
      title="놓치고 있는 취업·교육 혜택을 찾아보세요"
      description={
        <>
          몇 가지 조건만 입력하면{" "}
          <br className="hidden sm:block" />
          현재 상황에 맞는 정부·지자체 지원제도를 찾아드립니다.
        </>
      }
      infoItems={INFO_ITEMS}
      ctaHeadline="2~3분이면 진단이 끝납니다"
      ctaDescription="지금 시작하면 받을 수 있는 지원제도를 바로 확인할 수 있어요."
      cta={
        /* 이미 결과가 있으면 두 버튼을 나란히 세운다. 카드 밖 작은 글줄로는 눈에 띄지 않았다. */
        <div className="flex flex-col gap-2 sm:flex-row">
          {latestResultSessionId && (
            <Link
              href={`/support/result/${latestResultSessionId}`}
              className="flex h-14 items-center justify-center gap-1.5 rounded-lg bg-brand-blue-50 px-6 text-body-2 font-bold text-brand-blue-700 transition-colors hover:bg-brand-blue-100/60"
            >
              지난 결과 보기
            </Link>
          )}
          <Button
            size="lg"
            onClick={onStart}
            disabled={loading}
            className="h-14 w-full rounded-lg bg-brand-blue-400 px-8 text-body-2 font-bold hover:bg-brand-blue-600 sm:w-auto"
          >
            {loading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                지원금 찾기
                <ArrowRight className="size-5" />
              </>
            )}
          </Button>
        </div>
      }
      highlightTitle="이 진단으로 확인할 수 있는 것"
      highlights={RESULT_ITEMS}
      note={
        <>
          주민등록번호, 상세 재산정보 등 민감정보는 수집하지 않습니다. 소득/재산 조건이 필요한 정책은 &quot;확인
          필요&quot;로 안내되며, 최종 신청 가능 여부는 해당 운영기관에서 확인해야 합니다.
        </>
      }
    />
  );
}

export function SupportFlow({
  autoStart = false,
  isLoggedIn = true,
  latestResultSessionId,
}: {
  autoStart?: boolean;
  isLoggedIn?: boolean;
  /** 이미 받은 진단이 있으면 그 결과 세션. 소개 화면에서 지난 결과로 가는 길을 보여준다. */
  latestResultSessionId?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "wizard">("intro");
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  // 되돌아온 뒤 다시 앞으로 갈 수 있게, 지금까지 가장 멀리 간 문항을 기억한다.
  const [furthestIndex, setFurthestIndex] = useState(0);
  const [answers, setAnswers] = useState<SupportAssessmentAnswers>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // React StrictMode의 이중 실행으로 프리필이 두 번 돌지 않게 막는다.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!autoStart || autoStartedRef.current) return;
    autoStartedRef.current = true;
    // handleStart는 렌더마다 새로 만들어지지만 여기서는 최초 1회만 쓰면 된다.
    void handleStart();
  }, [autoStart]);

  async function handleStart() {
    // 소개 화면은 비로그인도 볼 수 있다. 진단 결과를 계정에 남기므로
    // 시작하는 시점에 로그인으로 보내고, 끝나면 곧바로 시작 지점으로 돌아온다.
    if (!isLoggedIn) {
      // 로그인 후에는 소개 화면으로 되돌린다. start=1 을 실어 보내면 로그인만
      // 끝냈을 뿐인데 곧바로 문항이 떠서 무엇을 시작한 건지 확인할 틈이 없다.
      router.push(`/login?next=${encodeURIComponent("/support")}`);
      return;
    }
    setLoadingPrefill(true);
    try {
      const anonymousId = getOrCreateAnonymousId();
      const prefill = await getSupportAssessmentPrefillAction({ anonymousId: anonymousId || undefined });
      setAnswers((prev) => ({ ...prev, ...prefill }));
    } catch {
      // 프리필 실패는 진단 진행을 막지 않는다 - 빈 값으로 시작한다.
    } finally {
      setLoadingPrefill(false);
      setPhase("wizard");
    }
  }

  if (phase === "intro") {
    // ?start=1로 들어온 경우 소개 화면을 스치듯 보여주지 않고 바로 문항으로 넘어간다.
    if (autoStart) {
      return (
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center px-4 text-center">
          <Loader2 className="size-6 animate-spin text-brand-blue-400" />
          <p className="mt-4 text-label-1 text-slate-500">지원금 찾기를 준비하고 있어요…</p>
        </div>
      );
    }
    return <SupportIntro onStart={() => void handleStart()} loading={loadingPrefill} latestResultSessionId={latestResultSessionId} />;
  }

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const canProceed = isStepFilled(step, answers);

  const groupIndex = GROUPS.findIndex((g) => g.key === step.group);
  const groupSteps = STEPS.filter((x) => x.group === step.group);
  const posInGroup = groupSteps.findIndex((x) => x.id === step.id);

  function segmentFill(i: number) {
    if (i < groupIndex) return 100;
    if (i > groupIndex) return 0;
    return ((posInGroup + 1) / groupSteps.length) * 100;
  }

  function updateAnswer(patch: Partial<SupportAssessmentAnswers>) {
    setAnswers((prev) => ({ ...prev, ...patch }));
    setError(null);
  }

  async function handleNext() {
    if (step.required && !canProceed) {
      setError("이 질문은 답변이 필요해요.");
      return;
    }
    if (!isLast) {
      const next = Math.min(stepIndex + 1, STEPS.length - 1);
      setStepIndex(next);
      setFurthestIndex((f) => Math.max(f, next));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const anonymousId = getOrCreateAnonymousId();
      const result = await submitSupportAssessmentAction({ anonymousId: anonymousId || undefined, answers });
      router.push(`/support/result/${result.sessionId}`);
    } catch {
      setError("결과를 계산하는 중 문제가 발생했어요. 다시 시도해주세요.");
      setSubmitting(false);
    }
  }

  function handlePrev() {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    // data-wizard: 한 문항에 집중시키는 화면이라 globals.css에서 푸터를 숨긴다.
    <div data-wizard="true" className="min-h-[calc(100vh-4rem)] bg-atomic-mono-50 pb-32">
      {/* 진행 바 - 대분류 3칸 */}
      <div className="sticky top-16 z-30">
        <div className="flex gap-1.5 bg-atomic-mono-50 px-4 pt-3">
          {GROUPS.map((g, i) => (
            <div key={g.key} className="h-1.5 flex-1 overflow-hidden rounded-full bg-atomic-mono-200">
              <div
                className="h-full rounded-full bg-brand-blue-400 transition-[width] duration-300"
                style={{ width: `${segmentFill(i)}%` }}
              />
            </div>
          ))}
        </div>
        {/*
          문항 영역과 같은 폭·패딩을 써서 뒤로가기 화살표가 아래 선택지 박스와 왼쪽 라인을 맞춘다.
          -ml-2는 아이콘 버튼의 안쪽 여백(36px 박스 안 20px 아이콘)을 상쇄해 아이콘 자체를 정렬시킨다.
        */}
        <div className="mx-auto flex max-w-[24.5rem] items-center bg-atomic-mono-50/90 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={handlePrev}
            disabled={stepIndex === 0 || submitting}
            aria-label="이전 문항"
            className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-atomic-mono-200 disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowLeft className="size-5" />
          </button>
          {/* 지금 어느 분류인지는 화면 상단에 고정으로 둔다. */}
          <span className="flex-1 truncate text-center text-label-1 font-semibold text-brand-blue-600">
            {GROUPS[groupIndex]?.label}
          </span>
          {/* 이미 지나온 문항이면 하단 CTA를 쓰지 않고도 앞으로 되돌아갈 수 있게 한다. */}
          <button
            type="button"
            onClick={handleNext}
            disabled={(stepIndex >= furthestIndex && !canProceed) || isLast || submitting}
            aria-label="다음 문항"
            className="-mr-2 flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-atomic-mono-200 disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowRight className="size-5" />
          </button>
        </div>
      </div>

      {/* 문항 */}
      <div className="mx-auto mt-8 max-w-[24.5rem] px-4">
        {/* 분류 안에서 몇 번째 문항인지 - 질문과 함께 읽히는 정보라 질문 위에 둔다. */}
        <p className="text-center text-body-2 font-bold text-slate-900">
          {posInGroup + 1}/{groupSteps.length}
        </p>
        <h2 className="mt-3 text-center text-title-2 font-bold text-slate-900">{step.title}</h2>
        {step.description && (
          <p className="mt-3 text-center text-body-2-reading text-slate-500">{step.description}</p>
        )}

        <div className="mt-10">
          <StepBody step={step} answers={answers} onChange={updateAnswer} />
        </div>

        {error && <p className="mt-6 text-center text-label-1 font-medium text-red-500">{error}</p>}
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-atomic-mono-50 via-atomic-mono-50 to-transparent pt-6">
        <div className="mx-auto max-w-[24.5rem] px-4 pb-8">
          <Button
            onClick={() => void handleNext()}
            disabled={submitting || (step.required && !canProceed)}
            className="h-14 w-full rounded-lg bg-brand-blue-400 text-body-1 font-semibold hover:bg-brand-blue-600"
          >
            {submitting ? <Loader2 className="size-5 animate-spin" /> : isLast ? "결과 확인하기" : "다음"}
          </Button>
        </div>
      </div>
    </div>
  );
}
