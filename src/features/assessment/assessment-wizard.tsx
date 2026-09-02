"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollMoreHint } from "@/components/common/scroll-more-hint";
import { AnalyzingScreen } from "@/components/common/analyzing-screen";
import type { AssessmentQuestion, AssessmentSection } from "@/types";
import {
  completeAssessmentSessionAction,
  submitAssessmentAnswerAction,
} from "./assessment-actions";
import {
  QuestionRenderer,
  createEmptyAnswerValue,
  isAnswerValueFilled,
  parseScaleEndpointLabels,
  type AnswerValue,
} from "./question-renderer";

function toRawAnswerInput(value: AnswerValue): { optionId?: string; optionIds?: string[]; rawValue?: unknown } {
  switch (value.type) {
    case "SINGLE":
      return { optionId: value.optionId };
    case "MULTI":
      // 직접 적은 자격은 옵션 id 가 없어 rawValue 에 실어 보낸다 (answer-normalizer 가 다듬는다).
      return {
        optionIds: value.optionIds,
        rawValue: value.customTexts && value.customTexts.length > 0 ? { custom: value.customTexts } : undefined,
      };
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
  /** 취업 프로필에 이미 있는 정보로 미리 채워둔 답 (문항 id → 답). 비어 있으면 안내하지 않는다. */
  initialAnswers?: Record<string, AnswerValue>;
}

/**
 * 이 개수부터 "아래에 더 있어요" 힌트를 붙인다.
 *
 * 문항 앞머리(진행률·질문·설명)를 빼면 세로 목록은 한 화면에 여섯 개까지 들어간다.
 * 연령대(6개)는 다 보이고 자격증(7개)은 잘리므로 경계는 7이다.
 * 화면 높이를 재서 판단하면 기기마다 결과가 갈려 고정값으로 둔다.
 */
const SCROLL_HINT_MIN_OPTIONS = 7;

/**
 * 답변 유형은 보지 않고 선택지 개수만 센다.
 * 유형을 나열하면 QUALIFICATION_MULTI처럼 나중에 늘어난 유형이 조용히 빠진다.
 * 척도·숫자·지역 등 목록이 아닌 유형은 옵션이 0개라 자연히 걸러진다.
 */
function needsScrollHint(question: AssessmentQuestion): boolean {
  return (question.options?.length ?? 0) >= SCROLL_HINT_MIN_OPTIONS;
}

/** 결과 화면으로 넘어가기 전 분석 화면을 보여줄 최소 시간. */
const ANALYZING_MS = 2500;
const ANALYZING_STEPS = [
  "답변을 정리하고 있어요",
  "적합한 직업을 찾고 있어요",
  "채용공고와 맞춰보고 있어요",
  "결과를 준비하고 있어요",
];

export function AssessmentWizard({
  sessionId,
  sections,
  questions,
  initialStep,
  initialAnswers,
}: AssessmentWizardProps) {
  const router = useRouter();
  const prefilledCount = Object.keys(initialAnswers ?? {}).length;
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(Math.max(initialStep, 0), questions.length - 1),
  );
  // 되돌아온 뒤 다시 앞으로 갈 수 있게, 지금까지 가장 멀리 간 문항을 기억한다.
  const [furthestIndex, setFurthestIndex] = useState(currentIndex);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(initialAnswers ?? {});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = questions[currentIndex];
  const value = answers[question.id] ?? createEmptyAnswerValue(question);
  const isLast = currentIndex === questions.length - 1;
  // 결과 계산은 1초 안에 끝나 화면이 번쩍 지나간다. 무엇을 하는지 보여주는 최소 노출 시간을 둔다.
  const [analyzing, setAnalyzing] = useState(false);

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
        setAnalyzing(true);
        // 계산과 최소 노출 시간을 함께 기다린다 (둘 중 늦은 쪽 기준).
        await Promise.all([
          completeAssessmentSessionAction(sessionId),
          new Promise((resolve) => setTimeout(resolve, ANALYZING_MS)),
        ]);
        router.push(`/assessment/result/${sessionId}`);
        return;
      }
      const next = Math.min(currentIndex + 1, questions.length - 1);
      setCurrentIndex(next);
      setFurthestIndex((f) => Math.max(f, next));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setAnalyzing(false);
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

  if (analyzing) {
    return (
      <div data-wizard="true">
        <AnalyzingScreen steps={ANALYZING_STEPS} durationMs={ANALYZING_MS} />
      </div>
    );
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
        {/*
          문항 영역과 같은 폭·패딩을 써서 뒤로가기 화살표가 아래 선택지 박스와 왼쪽 라인을 맞춘다.
          -ml-2는 아이콘 버튼의 안쪽 여백(36px 박스 안 20px 아이콘)을 상쇄해 아이콘 자체를 정렬시킨다.
        */}
        <div className="mx-auto flex max-w-[24.5rem] items-center bg-atomic-mono-50/90 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0 || submitting}
            aria-label="이전 문항"
            className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-atomic-mono-200 disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowLeft className="size-5" />
          </button>
          {/* 지금 어느 분류인지는 화면 상단에 고정으로 둔다. */}
          <span className="flex-1 truncate text-center text-label-1 font-semibold text-brand-blue-600">
            {section?.label}
          </span>
          {/* 이미 지나온 문항이면 하단 CTA를 쓰지 않고도 앞으로 되돌아갈 수 있게 한다. */}
          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex >= furthestIndex || submitting}
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
          {posInSection + 1}/{sectionTotal}
        </p>
        {/*
          질문은 두 줄이 되기 쉽다. break-keep 은 한글 어절 중간에서 잘리지 않게,
          text-balance 는 두 줄 길이를 맞춰 마지막 줄에 한 단어만 남는 걸 막고,
          leading-[1.4] 는 기본 line-height(1.2)에서 살짝 여유를 준다.
        */}
        <h2 className="mt-3 text-center text-title-2 leading-[1.4] font-bold break-keep text-balance text-slate-900">
          {question.questionText}
          {!question.required && (
            <span className="ml-2 text-label-1 font-normal text-slate-400">(선택)</span>
          )}
        </h2>
        {/*
          척도 문항의 "1(부담스럽다) ~ 5(자신있다)" 설명은 척도 하단 라벨로 옮겼으므로 여기서는 감춘다.
          그 외 문항 설명은 그대로 문항 아래에 남긴다.
        */}
        {question.description && !parseScaleEndpointLabels(question.description) && (
          <p className="mt-3 text-center text-body-2-reading text-slate-500">{question.description}</p>
        )}

        {/*
          미리 채워진 답이 있다는 것을 첫 문항에서 한 번 알려준다. 고치는 건 각 문항에서 바로 하면 된다.
          break-keep 은 한글이 어절 중간에서 잘리지 않게 한다. 좁은 화면에서 "확인하면서" 뒤가 아니라
          문장 사이에서 나뉘도록 두 문장을 <span block> 으로 갈라 각자 한 덩어리로 접히게 한다.
        */}
        {prefilledCount > 0 && currentIndex === 0 && (
          <p className="mt-4 text-center text-label-1 break-keep text-slate-400">
            <span className="inline-block">이미 알려주신 정보 {prefilledCount}개는 미리 채워뒀어요.</span>{" "}
            <span className="inline-block">확인하면서 넘어가주세요.</span>
          </p>
        )}

        <div className="mt-10">
          <QuestionRenderer question={question} value={value} onChange={handleChange} />
        </div>

        {error && <p className="mt-6 text-center text-label-1 font-medium text-red-500">{error}</p>}

        {/* 선택지가 긴 문항에서만 "아래에 더 있어요" 힌트를 띄운다. 끝까지 내려오면 사라진다. */}
        {needsScrollHint(question) && <ScrollMoreHint key={question.id} />}
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
