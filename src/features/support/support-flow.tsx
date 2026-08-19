"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Coins, Gift, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import { AGE_GROUP_LABELS, EMPLOYMENT_STATUS_LABELS, DESIRED_START_TIMING_LABELS, QUALIFICATION_LABELS, REGION_LABELS } from "@/lib/labels";
import { getSupportAssessmentPrefillAction, submitSupportAssessmentAction } from "./support-actions";
import type { AgeGroup, DesiredStartTiming, EmploymentStatus, Region, SupportAssessmentAnswers } from "@/types";

const AGE_GROUP_OPTIONS = Object.entries(AGE_GROUP_LABELS) as [AgeGroup, string][];
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
  { code: "care_worker", label: "요양보호사·돌봄" },
  { code: "social_worker", label: "사회복지사" },
  { code: "office_admin", label: "사무·행정직" },
  { code: "facility_cleaning", label: "시설관리·미화" },
  { code: "hospital_companion", label: "병원동행·간병" },
  { code: "logistics_driver", label: "배송·운전직" },
  { code: "other", label: "기타 / 잘 모르겠어요" },
];

const QUALIFICATION_OPTIONS = Object.entries(QUALIFICATION_LABELS) as [string, string][];

const TRAINING_WILLINGNESS_LABELS: Record<number, string> = {
  1: "전혀 없음",
  2: "낮음",
  3: "보통",
  4: "높음",
  5: "매우 높음",
};

type StepId =
  | "ageGroup"
  | "region"
  | "employmentStatus"
  | "desiredStartTiming"
  | "trainingWillingness"
  | "desiredJobCategories"
  | "heldQualifications"
  | "careerBreak"
  | "openToGovSupport";

interface StepConfig {
  id: StepId;
  title: string;
  description?: string;
  required: boolean;
}

const STEPS: StepConfig[] = [
  { id: "ageGroup", title: "현재 연령대를 알려주세요", required: true },
  { id: "region", title: "거주지역이 어디신가요?", required: true },
  { id: "employmentStatus", title: "현재 취업상태를 선택해주세요", required: true },
  { id: "desiredStartTiming", title: "취업 희망시기는 언제인가요?", required: true },
  {
    id: "trainingWillingness",
    title: "직업훈련·교육 과정에 참여할 의향이 있으신가요?",
    description: "1(전혀 없음) ~ 5(매우 높음)",
    required: true,
  },
  {
    id: "desiredJobCategories",
    title: "희망하는 직종이 있다면 선택해주세요",
    description: "복수 선택 가능해요. (선택 안 하셔도 괜찮아요)",
    required: false,
  },
  {
    id: "heldQualifications",
    title: "현재 보유하고 계신 자격이 있나요?",
    description: "복수 선택 가능해요. (선택 안 하셔도 괜찮아요)",
    required: false,
  },
  { id: "careerBreak", title: "경력단절 기간이 있으신가요?", required: false },
  {
    id: "openToGovSupport",
    title: "정부·지자체 지원제도를 적극적으로 활용할 의향이 있으신가요?",
    description: "참고용 정보로만 활용되며 매칭 점수에는 직접 반영되지 않아요.",
    required: false,
  },
];

function isStepFilled(step: StepConfig, answers: SupportAssessmentAnswers): boolean {
  if (!step.required) return true;
  switch (step.id) {
    case "ageGroup":
      return Boolean(answers.ageGroup);
    case "region":
      return Boolean(answers.region);
    case "employmentStatus":
      return Boolean(answers.employmentStatus);
    case "desiredStartTiming":
      return Boolean(answers.desiredStartTiming);
    case "trainingWillingness":
      return typeof answers.trainingWillingness === "number";
    default:
      return true;
  }
}

function ChipButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-14 items-center justify-between rounded-xl border px-5 py-4 text-left text-body-2 font-medium transition-colors",
        selected
          ? "border-brand-blue-500 bg-brand-blue-50 text-brand-blue-700"
          : "border-border text-slate-700 hover:border-brand-blue-300 hover:bg-brand-blue-50/50",
      )}
    >
      {children}
      {selected && <Check className="size-5 shrink-0 text-brand-blue-600" />}
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
    case "ageGroup":
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {AGE_GROUP_OPTIONS.map(([code, label]) => (
            <ChipButton key={code} selected={answers.ageGroup === code} onClick={() => onChange({ ageGroup: code })}>
              {label}
            </ChipButton>
          ))}
        </div>
      );
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
                  ? "border-brand-blue-500 bg-brand-blue-50 text-brand-blue-700"
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
        <div className="flex flex-col gap-3">
          {EMPLOYMENT_STATUS_OPTIONS.map(([code, label]) => (
            <ChipButton
              key={code}
              selected={answers.employmentStatus === code}
              onClick={() => onChange({ employmentStatus: code })}
            >
              {label}
            </ChipButton>
          ))}
        </div>
      );
    case "desiredStartTiming":
      return (
        <div className="flex flex-col gap-3">
          {DESIRED_START_TIMING_OPTIONS.map(([code, label]) => (
            <ChipButton
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
                  "flex aspect-square min-h-14 flex-col items-center justify-center rounded-2xl border text-body-1 font-bold transition-colors",
                  answers.trainingWillingness === n
                    ? "border-brand-blue-500 bg-brand-blue-500 text-white"
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
    case "desiredJobCategories": {
      const current = answers.desiredJobCategories ?? [];
      return (
        <div className="flex flex-col gap-3">
          {JOB_CATEGORY_OPTIONS.map((opt) => {
            const selected = current.includes(opt.code);
            return (
              <ChipButton
                key={opt.code}
                selected={selected}
                onClick={() =>
                  onChange({
                    desiredJobCategories: selected ? current.filter((c) => c !== opt.code) : [...current, opt.code],
                  })
                }
              >
                {opt.label}
              </ChipButton>
            );
          })}
        </div>
      );
    }
    case "heldQualifications": {
      const current = answers.heldQualifications ?? [];
      return (
        <div className="flex flex-col gap-3">
          {QUALIFICATION_OPTIONS.map(([code, label]) => {
            const selected = current.includes(code);
            return (
              <ChipButton
                key={code}
                selected={selected}
                onClick={() =>
                  onChange({ heldQualifications: selected ? current.filter((c) => c !== code) : [...current, code] })
                }
              >
                {label}
              </ChipButton>
            );
          })}
        </div>
      );
    }
    case "careerBreak":
      return (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <ChipButton selected={answers.careerBreak === true} onClick={() => onChange({ careerBreak: true })}>
              있어요
            </ChipButton>
            <ChipButton
              selected={answers.careerBreak === false}
              onClick={() => onChange({ careerBreak: false, careerBreakMonths: undefined })}
            >
              없어요
            </ChipButton>
          </div>
          {answers.careerBreak && (
            <div className="flex items-center gap-3">
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
        <div className="flex gap-3">
          <ChipButton selected={answers.openToGovSupport === true} onClick={() => onChange({ openToGovSupport: true })}>
            네, 적극 활용하고 싶어요
          </ChipButton>
          <ChipButton selected={answers.openToGovSupport === false} onClick={() => onChange({ openToGovSupport: false })}>
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
  { icon: Gift, label: "무료" },
  { icon: Sparkles, label: "결과 즉시 확인" },
];

const RESULT_ITEMS = ["받을 수 있는 취업·훈련 지원금", "생활·지역 지원제도", "지원 가능성 등급", "신청 방법과 서류"];

function SupportIntro({ onStart, loading }: { onStart: () => void; loading: boolean }) {
  return (
    <div className="rounded-3xl border border-border bg-white p-8 shadow-sm sm:p-12">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-blue-50 text-brand-blue-600">
        <Coins className="size-7" />
      </span>

      <h1 className="mt-6 text-title-2 font-extrabold text-slate-900 sm:text-headline-3">
        놓치고 있는 취업·교육 혜택을 찾아보세요
      </h1>
      <p className="mt-3 max-w-xl text-body-2-reading text-slate-600">
        몇 가지 조건만 입력하면
        <br className="hidden sm:block" />
        현재 상황에 맞는 정부·지자체 지원제도를 찾아드립니다.
      </p>

      <div className="mt-6 flex flex-wrap gap-4 text-label-1 font-semibold text-slate-500">
        {INFO_ITEMS.map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <Icon className="size-4 text-brand-blue-500" />
            {label}
          </span>
        ))}
      </div>

      <div className="mt-8">
        <Button
          size="lg"
          onClick={onStart}
          disabled={loading}
          className="h-14 w-full rounded-xl bg-brand-blue-500 px-8 text-body-2 font-bold hover:bg-brand-blue-600 sm:w-auto"
        >
          {loading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              무료로 지원금 찾기
              <ArrowRight className="size-5" />
            </>
          )}
        </Button>
      </div>

      <div className="mt-10 rounded-2xl bg-brand-blue-50/60 p-6">
        <p className="text-label-1 font-bold text-brand-blue-700">이 진단으로 확인할 수 있는 것</p>
        <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {RESULT_ITEMS.map((item) => (
            <li key={item} className="flex items-center gap-2 text-body-2 text-slate-700">
              <CheckCircle2 className="size-4 shrink-0 text-brand-blue-500" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-label-1 text-slate-400">
        주민등록번호, 상세 재산정보 등 민감정보는 수집하지 않습니다. 소득/재산 조건이 필요한 정책은 &quot;확인
        필요&quot;로 안내되며, 최종 신청 가능 여부는 해당 운영기관에서 확인해야 합니다.
      </p>
    </div>
  );
}

export function SupportFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "wizard">("intro");
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<SupportAssessmentAnswers>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
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
    return <SupportIntro onStart={() => void handleStart()} loading={loadingPrefill} />;
  }

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const canProceed = isStepFilled(step, answers);
  const progressPercent = Math.round((stepIndex / STEPS.length) * 100);

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
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
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
    <div className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-10">
      <Progress value={progressPercent} className="h-2" />
      <div className="mt-4 flex items-center justify-between text-label-1 font-semibold text-brand-blue-600">
        <span>지원금 진단</span>
        <span className="text-slate-400">
          {stepIndex + 1} / {STEPS.length}
        </span>
      </div>

      <h2 className="mt-4 text-title-3 font-bold text-slate-900 sm:text-title-2">
        {step.title}
        {!step.required && <span className="ml-2 text-label-1 font-normal text-slate-400">(선택)</span>}
      </h2>
      {step.description && <p className="mt-2 text-body-2-reading text-slate-500">{step.description}</p>}

      <div className="mt-6">
        <StepBody step={step} answers={answers} onChange={updateAnswer} />
      </div>

      {error && <p className="mt-4 text-label-1 font-medium text-red-500">{error}</p>}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={stepIndex === 0 || submitting}
          className="h-12 rounded-xl px-5"
        >
          <ArrowLeft className="size-4" />
          이전
        </Button>
        <Button
          onClick={() => void handleNext()}
          disabled={submitting || (step.required && !canProceed)}
          className="h-12 rounded-xl bg-brand-blue-500 px-6 text-body-2 font-semibold hover:bg-brand-blue-600"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isLast ? (
            "결과 확인하기"
          ) : (
            <>
              다음
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
