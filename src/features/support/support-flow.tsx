"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Clock, Coins, FileText, Gift, Landmark, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntroHero } from "@/components/common/intro-hero";
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
  group: GroupKey;
  title: string;
  description?: string;
  required: boolean;
}

type GroupKey = "basic" | "status" | "target" | "intent";

/** 진행 표시의 주 단위. 9개 문항을 4개 대분류로 묶는다. */
const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "basic", label: "기본 정보" },
  { key: "status", label: "취업 현황" },
  { key: "target", label: "희망 직종·자격" },
  { key: "intent", label: "교육·지원 의향" },
];

const STEPS: StepConfig[] = [
  { id: "ageGroup", group: "basic", title: "현재 연령대를 알려주세요", required: true },
  { id: "region", group: "basic", title: "거주지역이 어디신가요?", required: true },
  { id: "employmentStatus", group: "status", title: "현재 취업상태를 선택해주세요", required: true },
  { id: "desiredStartTiming", group: "status", title: "취업 희망시기는 언제인가요?", required: true },
  { id: "careerBreak", group: "status", title: "경력단절 기간이 있으신가요?", required: false },
  {
    id: "desiredJobCategories",
    group: "target",
    title: "희망하는 직종이 있다면 선택해주세요",
    description: "복수 선택 가능해요. (선택 안 하셔도 괜찮아요)",
    required: false,
  },
  {
    id: "heldQualifications",
    group: "target",
    title: "현재 보유하고 계신 자격이 있나요?",
    description: "복수 선택 가능해요. (선택 안 하셔도 괜찮아요)",
    required: false,
  },
  {
    id: "trainingWillingness",
    group: "intent",
    title: "직업훈련·교육 과정에 참여할 의향이 있으신가요?",
    description: "1(전혀 없음) ~ 5(매우 높음)",
    required: true,
  },
  {
    id: "openToGovSupport",
    group: "intent",
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
  indicator = "none",
  children,
}: {
  selected: boolean;
  onClick: () => void;
  indicator?: "none" | "radio" | "check";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex min-h-14 items-center justify-center rounded-xl border bg-white py-3.5 text-center text-body-2 font-medium transition-colors",
        indicator === "none" ? "px-4" : "px-11",
        selected
          ? "border-brand-blue-200 bg-brand-blue-50 text-brand-blue-700"
          : "border-border text-slate-700 hover:border-brand-blue-300 hover:bg-brand-blue-50/50",
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
            <ChipButton indicator="radio"
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
    case "desiredJobCategories": {
      const current = answers.desiredJobCategories ?? [];
      return (
        <div className="flex flex-col gap-2">
          {JOB_CATEGORY_OPTIONS.map((opt) => {
            const selected = current.includes(opt.code);
            return (
              <ChipButton indicator="check"
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
        <div className="flex flex-col gap-2">
          {QUALIFICATION_OPTIONS.map(([code, label]) => {
            const selected = current.includes(code);
            return (
              <ChipButton indicator="check"
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
  { icon: Gift, label: "무료" },
  { icon: Sparkles, label: "결과 즉시 확인" },
];

const RESULT_ITEMS = ["받을 수 있는 취업·훈련 지원금", "생활·지역 지원제도", "지원 가능성 등급", "신청 방법과 서류"];

function SupportIntro({ onStart, loading }: { onStart: () => void; loading: boolean }) {
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
      decorIcons={[Landmark, BadgeCheck, FileText]}
      ctaHeadline="2~3분이면 진단이 끝납니다"
      ctaDescription="지금 시작하면 받을 수 있는 지원제도를 바로 확인할 수 있어요."
      cta={
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
              무료로 지원금 찾기
              <ArrowRight className="size-5" />
            </>
          )}
        </Button>
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

export function SupportFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "wizard">("intro");
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  // 되돌아온 뒤 다시 앞으로 갈 수 있게, 지금까지 가장 멀리 간 문항을 기억한다.
  const [furthestIndex, setFurthestIndex] = useState(0);
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

  // 대분류를 진행의 주 단위로 삼는다. 분류명과 분류 내 위치를 함께 보여준다.
  const groupIndex = GROUPS.findIndex((g) => g.key === step.group);
  const groupSteps = STEPS.filter((x) => x.group === step.group);
  const posInGroup = groupSteps.findIndex((x) => x.id === step.id);

  function segmentFill(i: number) {
    if (i < groupIndex) return 100;
    if (i > groupIndex) return 0;
    return groupSteps.length > 0 ? (posInGroup / groupSteps.length) * 100 : 0;
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
      {/* 진행 바 - 대분류 4칸 */}
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
            disabled={stepIndex >= furthestIndex || submitting}
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
        <h2 className="mt-3 text-center text-title-2 font-bold text-slate-900">
          {step.title}
          {!step.required && <span className="ml-2 text-label-1 font-normal text-slate-400">(선택)</span>}
        </h2>
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
