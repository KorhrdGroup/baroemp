"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssessmentQuestion, AssessmentSection } from "@/types";
import {
  completeAssessmentSessionAction,
  submitAssessmentAnswerAction,
} from "./assessment-actions";
import {
  QuestionRenderer,
  createEmptyAnswerValue,
  isAnswerValueFilled,
  type AnswerValue,
} from "./question-renderer";

function toRawAnswerInput(value: AnswerValue): { optionId?: string; optionIds?: string[]; rawValue?: unknown } {
  switch (value.type) {
    case "SINGLE":
      return { optionId: value.optionId };
    case "MULTI":
      return { optionIds: value.optionIds };
    case "SCALE":
      return { rawValue: value.value };
    case "NUMBER":
      return { rawValue: value.value };
    case "TEXT":
      return { rawValue: value.value };
    case "REGION":
      return { rawValue: { sido: value.sido } };
    case "SALARY_RANGE":
      return { rawValue: { min: value.min, max: value.max } };
    default:
      return {};
  }
}

interface AssessmentWizardProps {
  sessionId: string;
  sections: AssessmentSection[];
  questions: AssessmentQuestion[];
  initialStep: number;
}

export function AssessmentWizard({ sessionId, sections, questions, initialStep }: AssessmentWizardProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(Math.max(initialStep, 0), questions.length - 1),
  );
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = questions[currentIndex];
  const value = answers[question.id] ?? createEmptyAnswerValue(question);
  const isLast = currentIndex === questions.length - 1;

  // 대분류(섹션)를 주 단계로, 분류 안의 문항 순서를 보조 정보로 보여준다.
  const { sectionIndex, section, posInSection, sectionTotal } = useMemo(() => {
    const idx = sections.findIndex((s) => s.key === question.section);
    const inSection = questions.filter((q) => q.section === question.section);
    return {
      sectionIndex: idx,
      section: sections[idx],
      posInSection: inSection.findIndex((q) => q.id === question.id),
      sectionTotal: inSection.length,
    };
  }, [sections, questions, question]);

  // 진행 바는 대분류 5칸으로 나눈다. 지난 분류는 가득, 현재 분류는 그 안의 진척만큼 찬다.
  function segmentFill(i: number) {
    if (i < sectionIndex) return 100;
    if (i > sectionIndex) return 0;
    return sectionTotal > 0 ? (posInSection / sectionTotal) * 100 : 0;
  }

  const canProceed = useMemo(() => {
    if (!question.required) return true;
    return isAnswerValueFilled(value);
  }, [question.required, value]);

  function handleChange(next: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [question.id]: next }));
    setError(null);
  }

  async function handleNext() {
    if (question.required && !canProceed) {
      setError("이 문항은 답변이 필요해요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitAssessmentAnswerAction({
        sessionId,
        questionId: question.id,
        ...toRawAnswerInput(value),
      });
      if (isLast) {
        await completeAssessmentSessionAction(sessionId);
        router.push(`/assessment/result/${sessionId}`);
        return;
      }
      setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("답변을 저장하는 중 문제가 발생했어요. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrev() {
    setError(null);
    setCurrentIndex((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    // data-wizard: 한 문항에 집중시키는 화면이라 globals.css에서 푸터를 숨긴다.
    <div data-wizard="true" className="min-h-[calc(100vh-4rem)] bg-atomic-mono-50 pb-32">
      {/* 진행 바 - 전체 문항 기준 */}
      <div className="sticky top-16 z-30">
        <div className="flex gap-1.5 bg-atomic-mono-50 px-4 pt-3">
          {sections.map((s, i) => (
            <div key={s.key} className="h-1.5 flex-1 overflow-hidden rounded-full bg-atomic-mono-200">
              <div
                className="h-full rounded-full bg-brand-blue-400 transition-[width] duration-300"
                style={{ width: `${segmentFill(i)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center bg-atomic-mono-50/90 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0 || submitting}
            aria-label="이전 문항"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-atomic-mono-200 disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span className="flex-1 truncate px-2 text-center text-body-2 font-bold text-slate-900">
            {section?.label}
          </span>
          <span className="w-16 shrink-0 text-right text-label-1 font-medium text-slate-400">
            {posInSection + 1}/{sectionTotal}
          </span>
        </div>
      </div>

      {/* 문항 */}
      <div className="mx-auto mt-12 max-w-[24.5rem] px-4">
        <h2 className="text-center text-title-2 font-bold text-slate-900">
          {question.questionText}
          {!question.required && (
            <span className="ml-2 text-label-1 font-normal text-slate-400">(선택)</span>
          )}
        </h2>
        {question.description && (
          <p className="mt-3 text-center text-body-2-reading text-slate-500">{question.description}</p>
        )}

        <div className="mt-10">
          <QuestionRenderer question={question} value={value} onChange={handleChange} />
        </div>

        {error && <p className="mt-6 text-center text-label-1 font-medium text-red-500">{error}</p>}
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-atomic-mono-50 via-atomic-mono-50 to-transparent pt-6">
        <div className="mx-auto max-w-[24.5rem] px-4 pb-8">
          <Button
            onClick={handleNext}
            disabled={submitting || (question.required && !canProceed)}
            className="h-14 w-full rounded-lg bg-brand-blue-400 text-body-1 font-semibold hover:bg-brand-blue-600"
          >
            {submitting ? <Loader2 className="size-5 animate-spin" /> : isLast ? "결과 확인하기" : "다음"}
          </Button>
        </div>
      </div>
    </div>
  );
}
