"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  const [currentIndex, setCurrentIndex] = useState(() => Math.min(initialStep, questions.length - 1));
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = questions[currentIndex];
  const value = answers[question.id] ?? createEmptyAnswerValue(question);
  const sectionIndex = sections.findIndex((s) => s.key === question.section);
  const section = sections[sectionIndex];
  const isLast = currentIndex === questions.length - 1;
  const progressPercent = Math.round((currentIndex / questions.length) * 100);

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
      setError("이 질문은 답변이 필요해요.");
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
    <div className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-10">
      <Progress value={progressPercent} className="h-2" />
      <div className="mt-4 flex items-center justify-between text-label-1 font-semibold text-brand-blue-600">
        <span>
          {sectionIndex + 1} / {sections.length} {section?.label}
        </span>
        <span className="text-slate-400">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      <h2 className="mt-4 text-title-3 font-bold text-slate-900 sm:text-title-2">
        {question.questionText}
        {!question.required && <span className="ml-2 text-label-1 font-normal text-slate-400">(선택)</span>}
      </h2>
      {question.description && <p className="mt-2 text-body-2-reading text-slate-500">{question.description}</p>}

      <div className="mt-6">
        <QuestionRenderer question={question} value={value} onChange={handleChange} />
      </div>

      {error && <p className="mt-4 text-label-1 font-medium text-red-500">{error}</p>}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0 || submitting} className="h-12 rounded-xl px-5">
          <ArrowLeft className="size-4" />
          이전
        </Button>
        <Button
          onClick={handleNext}
          disabled={submitting || (question.required && !canProceed)}
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
