"use client";

import { Check } from "lucide-react";
import { REGION_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { AssessmentQuestion } from "@/types";

export type AnswerValue =
  | { type: "SINGLE"; optionId?: string }
  | { type: "MULTI"; optionIds: string[] }
  | { type: "SCALE"; value?: number }
  | { type: "NUMBER"; value?: number }
  | { type: "TEXT"; value?: string }
  | { type: "REGION"; sido?: string }
  | { type: "SALARY_RANGE"; min?: number; max?: number };

const REGION_OPTIONS = Object.entries(REGION_LABELS);

interface QuestionRendererProps {
  question: AssessmentQuestion;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
}

/**
 * answer_type에 따라 입력 UI를 렌더링한다.
 * 중장년 사용자를 고려해 클릭 영역을 크게, 글씨는 충분히 크게 유지한다.
 */
export function QuestionRenderer({ question, value, onChange }: QuestionRendererProps) {
  if (question.answerType === "SINGLE") {
    const current = value.type === "SINGLE" ? value.optionId : undefined;
    return (
      <div className="flex flex-col gap-3">
        {question.options?.map((option) => {
          const selected = current === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange({ type: "SINGLE", optionId: option.id })}
              className={cn(
                "flex min-h-14 items-center justify-between rounded-xl border px-5 py-4 text-left text-base font-medium transition-colors",
                selected
                  ? "border-brand-blue-500 bg-brand-blue-50 text-brand-blue-700"
                  : "border-border text-slate-700 hover:border-brand-blue-300 hover:bg-brand-blue-50/50",
              )}
            >
              {option.optionText}
              {selected && <Check className="size-5 text-brand-blue-600" />}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.answerType === "MULTI" || question.answerType === "QUALIFICATION_MULTI") {
    const current = value.type === "MULTI" ? value.optionIds : [];
    return (
      <div className="flex flex-col gap-3">
        {question.options?.map((option) => {
          const selected = current.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                const next = selected ? current.filter((id) => id !== option.id) : [...current, option.id];
                onChange({ type: "MULTI", optionIds: next });
              }}
              className={cn(
                "flex min-h-14 items-center justify-between rounded-xl border px-5 py-4 text-left text-base font-medium transition-colors",
                selected
                  ? "border-brand-blue-500 bg-brand-blue-50 text-brand-blue-700"
                  : "border-border text-slate-700 hover:border-brand-blue-300 hover:bg-brand-blue-50/50",
              )}
            >
              {option.optionText}
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-md border-2",
                  selected ? "border-brand-blue-500 bg-brand-blue-500 text-white" : "border-slate-300",
                )}
              >
                {selected && <Check className="size-4" />}
              </span>
            </button>
          );
        })}
        <p className="text-sm text-slate-400">해당하는 항목이 없다면 선택하지 않고 다음으로 넘어가셔도 됩니다.</p>
      </div>
    );
  }

  if (question.answerType === "SCALE") {
    const min = question.minScale ?? 1;
    const max = question.maxScale ?? 5;
    const current = value.type === "SCALE" ? value.value : undefined;
    const scaleValues = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
      <div>
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {scaleValues.map((n) => {
            const selected = current === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange({ type: "SCALE", value: n })}
                className={cn(
                  "flex aspect-square min-h-14 flex-col items-center justify-center rounded-2xl border text-lg font-bold transition-colors",
                  selected
                    ? "border-brand-blue-500 bg-brand-blue-500 text-white"
                    : "border-border text-slate-700 hover:border-brand-blue-300 hover:bg-brand-blue-50/50",
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[13px] text-slate-400">
          <span>{min}점</span>
          <span>{max}점</span>
        </div>
      </div>
    );
  }

  if (question.answerType === "NUMBER") {
    const current = value.type === "NUMBER" ? value.value : undefined;
    const unit = (question.metadata?.unit as string | undefined) ?? "";
    return (
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={current ?? ""}
          onChange={(e) => onChange({ type: "NUMBER", value: e.target.value === "" ? undefined : Number(e.target.value) })}
          className="h-14 w-40 rounded-xl border border-border px-4 text-lg font-semibold text-slate-800 focus:border-brand-blue-400 focus:outline-none"
          placeholder="0"
        />
        {unit && <span className="text-base text-slate-500">{unit}</span>}
      </div>
    );
  }

  if (question.answerType === "TEXT") {
    const current = value.type === "TEXT" ? value.value : "";
    return (
      <textarea
        value={current ?? ""}
        onChange={(e) => onChange({ type: "TEXT", value: e.target.value })}
        rows={3}
        className="w-full rounded-xl border border-border px-4 py-3 text-base text-slate-800 focus:border-brand-blue-400 focus:outline-none"
        placeholder="자유롭게 입력해주세요."
      />
    );
  }

  if (question.answerType === "REGION") {
    const current = value.type === "REGION" ? value.sido : undefined;
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {REGION_OPTIONS.map(([code, label]) => {
          const selected = current === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => onChange({ type: "REGION", sido: code })}
              className={cn(
                "min-h-12 rounded-xl border px-3 py-3 text-[15px] font-medium transition-colors",
                selected
                  ? "border-brand-blue-500 bg-brand-blue-50 text-brand-blue-700"
                  : "border-border text-slate-700 hover:border-brand-blue-300 hover:bg-brand-blue-50/50",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.answerType === "SALARY_RANGE") {
    const current: { min?: number; max?: number } = value.type === "SALARY_RANGE" ? value : {};
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={current.min ?? ""}
            onChange={(e) =>
              onChange({ type: "SALARY_RANGE", min: e.target.value === "" ? undefined : Number(e.target.value), max: current.max })
            }
            className="h-14 w-32 rounded-xl border border-border px-4 text-lg font-semibold text-slate-800 focus:border-brand-blue-400 focus:outline-none"
            placeholder="최소"
          />
          <span className="text-slate-400">~</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={current.max ?? ""}
            onChange={(e) =>
              onChange({ type: "SALARY_RANGE", min: current.min, max: e.target.value === "" ? undefined : Number(e.target.value) })
            }
            className="h-14 w-32 rounded-xl border border-border px-4 text-lg font-semibold text-slate-800 focus:border-brand-blue-400 focus:outline-none"
            placeholder="최대"
          />
        </div>
        <span className="text-base text-slate-500">만원</span>
      </div>
    );
  }

  return null;
}

export function createEmptyAnswerValue(question: AssessmentQuestion): AnswerValue {
  switch (question.answerType) {
    case "SINGLE":
      return { type: "SINGLE" };
    case "MULTI":
    case "QUALIFICATION_MULTI":
      return { type: "MULTI", optionIds: [] };
    case "SCALE":
      return { type: "SCALE" };
    case "NUMBER":
      return { type: "NUMBER" };
    case "TEXT":
      return { type: "TEXT" };
    case "REGION":
      return { type: "REGION" };
    case "SALARY_RANGE":
      return { type: "SALARY_RANGE" };
    default:
      return { type: "TEXT" };
  }
}

export function isAnswerValueFilled(value: AnswerValue): boolean {
  switch (value.type) {
    case "SINGLE":
      return Boolean(value.optionId);
    case "MULTI":
      return value.optionIds.length > 0;
    case "SCALE":
      return typeof value.value === "number";
    case "NUMBER":
      return typeof value.value === "number";
    case "TEXT":
      return Boolean(value.value?.trim());
    case "REGION":
      return Boolean(value.sido);
    case "SALARY_RANGE":
      return typeof value.min === "number" || typeof value.max === "number";
    default:
      return false;
  }
}
