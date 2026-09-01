"use client";

import { unstable_rethrow } from "next/navigation";

import { useState } from "react";
import { ArrowLeft, Check, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  DESIRED_START_TIMING_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  REGION_LABELS,
  WORK_TYPE_LABELS,
} from "@/lib/labels";
import { JOB_CATEGORY_OPTIONS } from "@/features/profile/profile-form-fields";
import { saveOnboardingProfileAction, skipOnboardingProfileAction } from "./onboarding-actions";
import type { CareerProfile, WorkType } from "@/types";

type StepId =
  | "employmentStatus"
  | "region"
  | "desiredStartTiming"
  | "desiredSalary"
  | "desiredWorkTypes"
  | "desiredJobCategories"
  | "isOpenToTraining"
  | "contact";

type GroupKey = "basic" | "condition" | "target" | "contact";

/** 진행 표시의 주 단위. 직업진단·지원금찾기와 같은 방식으로 문항을 대분류로 묶는다. */
const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "basic", label: "기본 정보" },
  { key: "condition", label: "희망 조건" },
  { key: "target", label: "희망 직종" },
  { key: "contact", label: "알림 받기" },
];

interface StepConfig {
  id: StepId;
  group: GroupKey;
  title: string;
  description?: string;
}

const STEPS: StepConfig[] = [
  { id: "employmentStatus", group: "basic", title: "현재 취업상태를 알려주세요" },
  { id: "region", group: "basic", title: "어느 지역에서 일하고 싶으신가요?" },
  { id: "desiredStartTiming", group: "condition", title: "언제부터 일하고 싶으신가요?" },
  {
    id: "desiredSalary",
    group: "condition",
    title: "희망하는 월급 수준은 어느 정도인가요?",
    description: "만원 단위로 입력해주세요.",
  },
  {
    id: "desiredWorkTypes",
    group: "condition",
    title: "어떤 형태로 일하고 싶으신가요?",
    description: "복수 선택 가능해요.",
  },
  {
    id: "desiredJobCategories",
    group: "target",
    title: "관심 있는 직종을 골라주세요",
    description: "복수 선택 가능해요.",
  },
  { id: "isOpenToTraining", group: "target", title: "직업훈련·교육 과정에 참여할 의향이 있으신가요?" },
  {
    id: "contact",
    group: "contact",
    title: "맞춤 정보를 알림톡으로 받아보시겠어요?",
    description: "조건에 맞는 새 공고·지원금이 열릴 때 먼저 알려드려요.",
  },
];

interface Answers {
  employmentStatus?: string;
  region?: string;
  desiredStartTiming?: string;
  desiredSalaryMin?: number;
  desiredSalaryMax?: number;
  desiredWorkTypes: WorkType[];
  desiredJobCategories: string[];
  isOpenToTraining?: boolean;
  phone: string;
  marketingConsent: boolean;
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

const NUMBER_INPUT_CLASS =
  "h-14 w-32 rounded-xl border border-border px-4 text-center text-body-1 font-semibold text-slate-800 focus:border-brand-blue-400 focus:outline-none";

export function OnboardingWizard({
  careerProfile,
  next,
  needsPhone,
  needsMarketingConsent,
}: {
  careerProfile: CareerProfile | null;
  next: string;
  /** 가입 때 연락처를 비워둔 사용자에게만 묻는다. */
  needsPhone: boolean;
  /** 가입 때 수신동의를 하지 않은 사용자에게만 묻는다. */
  needsMarketingConsent: boolean;
}) {
  // 연락처도 동의도 이미 받은 사용자에게는 알림 단계 자체를 만들지 않는다.
  const askContact = needsPhone || needsMarketingConsent;
  const steps = askContact ? STEPS : STEPS.filter((s) => s.id !== "contact");
  const groups = GROUPS.filter((g) => steps.some((s) => s.group === g.key));

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    employmentStatus: careerProfile?.employmentStatus,
    region: careerProfile?.region,
    desiredStartTiming: careerProfile?.desiredStartTiming,
    desiredSalaryMin: careerProfile?.desiredSalaryMin,
    desiredSalaryMax: careerProfile?.desiredSalaryMax,
    desiredWorkTypes: careerProfile?.desiredWorkTypes ?? [],
    desiredJobCategories: careerProfile?.desiredJobCategories ?? [],
    isOpenToTraining: careerProfile?.isOpenToTraining,
    phone: "",
    marketingConsent: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const groupIndex = groups.findIndex((g) => g.key === step.group);
  const groupSteps = steps.filter((s) => s.group === step.group);
  const posInGroup = groupSteps.findIndex((s) => s.id === step.id);

  /*
   * 진행 바는 프로필 입력 분류만 나타낸다. "알림 받기"는 한 단계뿐이라 칸을 주면
   * 0에서 100으로 튀기만 하고 진행을 보여주지 못한다. 프로필 입력이 끝난 뒤의
   * 선택 단계이므로, 그 단계에서는 앞 구간을 모두 채운 상태로 둔다.
   */
  const progressGroups = groups.filter((g) => g.key !== "contact");
  const onContactStep = step.group === "contact";

  function segmentFill(i: number) {
    if (onContactStep || i < groupIndex) return 100;
    if (i > groupIndex) return 0;
    /*
     * 지금 밟고 있는 문항까지 채운다. posInGroup만 세면 그룹의 첫 문항에서 칸이 0%라
     * 세 번째 그룹에 들어와 있는데도 아직 두 번째 단계처럼 읽혔다.
     */
    return groupSteps.length > 0 ? ((posInGroup + 1) / groupSteps.length) * 100 : 0;
  }

  function update(patch: Partial<Answers>) {
    setAnswers((prev) => ({ ...prev, ...patch }));
    setError(null);
  }

  function handlePrev() {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleNext() {
    if (!isLast) {
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await saveOnboardingProfileAction({
        next,
        employmentStatus: answers.employmentStatus,
        region: answers.region,
        desiredStartTiming: answers.desiredStartTiming,
        desiredSalaryMin: answers.desiredSalaryMin,
        desiredSalaryMax: answers.desiredSalaryMax,
        desiredWorkTypes: answers.desiredWorkTypes,
        desiredJobCategories: answers.desiredJobCategories,
        isOpenToTraining: answers.isOpenToTraining,
        phone: askContact ? answers.phone : undefined,
        marketingConsent: needsMarketingConsent ? answers.marketingConsent : undefined,
      });
      // 성공하면 서버에서 redirect하므로 여기로 돌아오지 않는다.
      setError(result?.phoneError ?? result?.error ?? null);
      setSubmitting(false);
    } catch (err) {
      // 성공 시 서버가 redirect()로 던지는 신호까지 여기서 잡으면
      // 화면 이동은 되면서 "오류" 문구만 남는다. 내부 신호는 먼저 되던진다.
      unstable_rethrow(err);
      setError("저장하는 중 문제가 발생했어요. 다시 시도해주세요.");
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    setSubmitting(true);
    try {
      await skipOnboardingProfileAction(next);
    } catch (err) {
      unstable_rethrow(err);
      setSubmitting(false);
    }
  }

  return (
    // data-wizard: 한 번에 하나만 묻는 화면이라 globals.css에서 푸터를 숨긴다.
    <div data-wizard="true" className="min-h-[calc(100vh-4rem)] bg-atomic-mono-50 pb-32">
      <div className="sticky top-16 z-30">
        <div className="flex gap-1.5 bg-atomic-mono-50 px-4 pt-3">
          {progressGroups.map((g, i) => (
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
          오른쪽은 진단과 달리 "나중에 하기"가 들어간다. 입력이 선택이라는 걸 어느 단계에서든
          알 수 있어야 해서 화면마다 노출한다.
        */}
        <div className="relative mx-auto flex max-w-[24.5rem] items-center bg-atomic-mono-50/90 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={handlePrev}
            disabled={stepIndex === 0 || submitting}
            aria-label="이전 단계"
            className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-atomic-mono-200 disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowLeft className="size-5" />
          </button>
          {/*
            좌우 버튼 폭이 달라(화살표 36px vs "나중에 하기") flex로 나눠서는 가운데가 맞지 않는다.
            컨테이너 기준 절대 중앙에 놓고, 좌우 버튼과 겹치지 않게 폭만 제한한다.
          */}
          <span className="pointer-events-none absolute left-1/2 max-w-[45%] -translate-x-1/2 truncate text-label-1 font-semibold text-brand-blue-600">
            {groups[groupIndex]?.label}
          </span>
          <button
            type="button"
            onClick={handleSkip}
            disabled={submitting}
            className="-mr-2 ml-auto shrink-0 rounded-lg px-2 py-1.5 text-label-1 font-medium text-slate-500 transition-colors hover:bg-atomic-mono-200 disabled:opacity-40"
          >
            나중에 하기
          </button>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-[24.5rem] px-4">
        {/*
          가입 버튼을 누르자마자 질문이 시작되므로, 첫 화면에서만 여기가 어디이고 왜 묻는지
          알려준다. 한 줄 텍스트로 두면 곧바로 이어지는 문항에 묻혀 읽히지 않아 카드로 감싼다.
        */}
        {stepIndex === 0 && (
          <div className="mb-7 rounded-xl border border-brand-blue-200 bg-white px-4 py-3.5 text-center">
            <p className="flex items-center justify-center gap-1.5 text-label-1 font-semibold text-brand-blue-700">
              <CheckCircle2 className="size-4 shrink-0" />
              가입이 완료되었어요
            </p>
            <p className="mt-1.5 text-label-1 break-keep text-slate-500">
              몇 가지만 알려주시면 맞춤 채용공고와 받을 수 있는 지원금을 찾아드려요. 지금 넘어가셔도 괜찮아요.
            </p>
          </div>
        )}
        {/* 한 단계뿐인 분류에서 "1/1"은 알려주는 게 없다. */}
        {groupSteps.length > 1 && (
          <p className="text-center text-body-2 font-bold text-slate-900">
            {posInGroup + 1}/{groupSteps.length}
          </p>
        )}
        <h2
          className={cn(
            "text-center text-title-2 font-bold break-keep text-slate-900",
            groupSteps.length > 1 && "mt-3",
          )}
        >
          {step.title}
        </h2>
        {step.description && (
          <p className="mt-3 text-center text-body-2-reading break-keep text-slate-500">{step.description}</p>
        )}

        <div className="mt-10">
          <StepBody answers={answers} step={step} needsPhone={needsPhone} needsMarketingConsent={needsMarketingConsent} onChange={update} />
        </div>

        {error && <p className="mt-6 text-center text-label-1 font-medium text-red-500">{error}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-atomic-mono-50 via-atomic-mono-50 to-transparent pt-6">
        <div className="mx-auto max-w-[24.5rem] px-4 pb-8">
          <Button
            onClick={handleNext}
            disabled={submitting}
            className="h-14 w-full rounded-lg bg-brand-blue-400 text-body-1 font-semibold hover:bg-brand-blue-600"
          >
            {submitting ? <Loader2 className="size-5 animate-spin" /> : isLast ? "저장하고 시작하기" : "다음"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepBody({
  step,
  answers,
  needsPhone,
  needsMarketingConsent,
  onChange,
}: {
  step: StepConfig;
  answers: Answers;
  needsPhone: boolean;
  needsMarketingConsent: boolean;
  onChange: (patch: Partial<Answers>) => void;
}) {
  switch (step.id) {
    case "employmentStatus":
      return (
        <div className="flex flex-col gap-2">
          {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([code, label]) => (
            <ChipButton
              key={code}
              indicator="radio"
              selected={answers.employmentStatus === code}
              onClick={() => onChange({ employmentStatus: code })}
            >
              {label}
            </ChipButton>
          ))}
        </div>
      );

    case "region":
      return (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Object.entries(REGION_LABELS).map(([code, label]) => (
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

    case "desiredStartTiming":
      return (
        <div className="flex flex-col gap-2">
          {Object.entries(DESIRED_START_TIMING_LABELS).map(([code, label]) => (
            <ChipButton
              key={code}
              indicator="radio"
              selected={answers.desiredStartTiming === code}
              onClick={() => onChange({ desiredStartTiming: code })}
            >
              {label}
            </ChipButton>
          ))}
        </div>
      );

    case "desiredSalary":
      return (
        /* 폭을 채울 수 없는 입력 줄이라 가운데로 모은다. */
        <div className="flex flex-wrap items-center justify-center gap-3">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            aria-label="희망 월급 최소"
            value={answers.desiredSalaryMin ?? ""}
            onChange={(e) => onChange({ desiredSalaryMin: e.target.value === "" ? undefined : Number(e.target.value) })}
            className={NUMBER_INPUT_CLASS}
            placeholder="최소"
          />
          <span className="text-slate-400">~</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            aria-label="희망 월급 최대"
            value={answers.desiredSalaryMax ?? ""}
            onChange={(e) => onChange({ desiredSalaryMax: e.target.value === "" ? undefined : Number(e.target.value) })}
            className={NUMBER_INPUT_CLASS}
            placeholder="최대"
          />
          <span className="text-body-2 text-slate-500">만원</span>
        </div>
      );

    case "desiredWorkTypes":
      return (
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(WORK_TYPE_LABELS).map(([code, label]) => {
            const value = code as WorkType;
            const selected = answers.desiredWorkTypes.includes(value);
            return (
              <ChipButton
                key={code}
                indicator="check"
                selected={selected}
                onClick={() =>
                  onChange({
                    desiredWorkTypes: selected
                      ? answers.desiredWorkTypes.filter((v) => v !== value)
                      : [...answers.desiredWorkTypes, value],
                  })
                }
              >
                {label}
              </ChipButton>
            );
          })}
        </div>
      );

    case "desiredJobCategories":
      return (
        <div className="flex flex-col gap-2">
          {JOB_CATEGORY_OPTIONS.map((opt) => {
            const selected = answers.desiredJobCategories.includes(opt.code);
            return (
              <ChipButton
                key={opt.code}
                indicator="check"
                selected={selected}
                onClick={() =>
                  onChange({
                    desiredJobCategories: selected
                      ? answers.desiredJobCategories.filter((v) => v !== opt.code)
                      : [...answers.desiredJobCategories, opt.code],
                  })
                }
              >
                {opt.label}
              </ChipButton>
            );
          })}
        </div>
      );

    case "isOpenToTraining":
      return (
        <div className="grid grid-cols-2 gap-3">
          <ChipButton
            indicator="radio"
            selected={answers.isOpenToTraining === true}
            onClick={() => onChange({ isOpenToTraining: true })}
          >
            있어요
          </ChipButton>
          <ChipButton
            indicator="radio"
            selected={answers.isOpenToTraining === false}
            onClick={() => onChange({ isOpenToTraining: false })}
          >
            없어요
          </ChipButton>
        </div>
      );

    case "contact":
      return (
        <div className="flex flex-col gap-4">
          {needsPhone && (
            <input
              type="tel"
              autoComplete="tel"
              aria-label="휴대전화번호"
              value={answers.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              className="h-14 w-full rounded-xl border border-border bg-white px-4 text-center text-body-1 font-semibold text-slate-800 focus:border-brand-blue-400 focus:outline-none"
              placeholder="010-1234-5678"
            />
          )}
          {needsMarketingConsent && (
            <label className="flex items-start gap-2.5 rounded-xl border border-border bg-white px-4 py-3.5 text-label-1 break-keep text-slate-700">
              <Checkbox
                className="mt-0.5"
                checked={answers.marketingConsent}
                onCheckedChange={(v) => onChange({ marketingConsent: v === true })}
              />
              <span>맞춤 채용공고·지원금 정보를 알림톡으로 받는 데 동의합니다. (선택, 언제든 해지 가능)</span>
            </label>
          )}
        </div>
      );

    default:
      return null;
  }
}
