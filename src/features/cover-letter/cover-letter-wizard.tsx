"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Check,
  FileText,
  HeartHandshake,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CoverLetterTemplateQuestion, ExperienceBankItem } from "@/types";
import type { QuestionCatalogEntry } from "@/lib/cover-letter/questions";
import { questionHeading } from "@/lib/cover-letter/questions";
import { ExperienceFormDialog } from "@/features/experience-bank/experience-form-dialog";
import { createCoverLetterAction } from "./cover-letter-actions";

/** 한 자기소개서에 담을 수 있는 문항 수. 이보다 많으면 끝까지 쓰는 사람이 거의 없다. */
const MAX_QUESTIONS = 6;

export interface WizardTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  defaultQuestions: CoverLetterTemplateQuestion[];
}

type Step = "template" | "questions" | "experiences";

/*
  양식 카드의 겉모습. 양식은 관리자가 늘릴 수 있어 이름으로 짝지을 수 없으므로
  차례대로 돌려 쓴다. 무슨 양식인지는 카드에 적힌 이름과 설명이 말한다.
*/
const TEMPLATE_CARD_STYLES = [
  { icon: FileText, tone: "bg-baro-blue-50", iconTone: "text-baro-blue" },
  { icon: Briefcase, tone: "bg-baro-blue-50", iconTone: "text-baro-blue" },
  { icon: HeartHandshake, tone: "bg-baro-blue-50", iconTone: "text-baro-blue" },
];

type PickedQuestion = CoverLetterTemplateQuestion & { key: string };

let keySeq = 0;
function nextKey() {
  keySeq += 1;
  return `q-${keySeq}`;
}

function toPicked(questions: CoverLetterTemplateQuestion[]): PickedQuestion[] {
  return questions.slice(0, MAX_QUESTIONS).map((q) => ({ ...q, key: nextKey() }));
}

/** 경험 카드에 한 줄로 보여줄 요약. 적어둔 칸 중 먼저 채워진 것을 쓴다. */
function experienceSummary(item: ExperienceBankItem): string {
  return (item.result || item.action || item.situation || item.task || "").trim();
}

/* ── 화면 조각 ──────────────────────────────────────────────────────────── */

function StepHeader({ step, title, description }: { step: 1 | 2; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2">
        {[1, 2].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-caption-1 font-bold",
                n <= step ? "bg-brand-blue-600 text-white" : "bg-slate-200 text-slate-600",
              )}
            >
              {n < step ? <Check className="size-4" /> : n}
            </span>
            {n === 1 && <span className={cn("h-px w-10", step > 1 ? "bg-brand-blue-600" : "bg-slate-200")} />}
          </div>
        ))}
      </div>
      {/* 화면 제목(h1)은 위 화면 머리가 맡는다. 단계 제목은 그 아래 h2. */}
      <h2 className="mt-5 text-title-2 font-extrabold text-slate-900">{title}</h2>
      <p className="mt-2 text-body-2 font-medium text-slate-600">{description}</p>
    </div>
  );
}

/** 1단계·2단계를 감싸는 종이 한 장. 흰 바탕 위라 그림자(shadow-card)로 가른다. */
function WizardCard({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl rounded-card bg-white p-6 shadow-card sm:p-10">{children}</div>;
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <Label className="text-body-2 font-bold text-slate-900">{children}</Label>
      {hint && <p className="mt-1 text-body-3 font-medium text-slate-600">{hint}</p>}
    </div>
  );
}

/* ── 본체 ──────────────────────────────────────────────────────────────── */

export function CoverLetterWizard({
  templates,
  catalog,
  initialTitle,
  experiences: initialExperiences,
  resumeId,
  targetOccupationId,
}: {
  templates: WizardTemplate[];
  catalog: QuestionCatalogEntry[];
  initialTitle?: string;
  experiences: ExperienceBankItem[];
  resumeId?: string;
  targetOccupationId?: string;
}) {
  const router = useRouter();

  const firstTemplate = templates[0];

  const [step, setStep] = useState<Step>("template");
  const [templateId, setTemplateId] = useState(firstTemplate.id);
  const [questions, setQuestions] = useState<PickedQuestion[]>(() => toPicked(firstTemplate.defaultQuestions));
  const [title, setTitle] = useState(initialTitle ?? "");

  const [experiences, setExperiences] = useState(initialExperiences);
  const [selectedExperienceIds, setSelectedExperienceIds] = useState<string[]>(() =>
    initialExperiences.map((e) => e.id),
  );
  const [experienceFormOpen, setExperienceFormOpen] = useState(false);

  /** 문항을 직접 쓰거나 고쳐 쓰는 창. key가 null이면 새로 추가. */
  const [questionDraft, setQuestionDraft] = useState<{ key: string | null; text: string } | null>(null);

  const [isCreating, startCreate] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const template = templates.find((t) => t.id === templateId) ?? firstTemplate;

  /*
    단계를 넘길 때 맨 위로 올린다. 다음 버튼은 화면 아래에 있어서, 그냥 두면
    새 단계의 제목이 화면 위로 지나가 버리고 바닥부터 보인다.
  */
  function goToStep(next: Step) {
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  /** 양식을 고르면 그 양식의 기본 문항을 담아 1단계로 넘어간다. */
  function startWithTemplate(next: WizardTemplate) {
    setTemplateId(next.id);
    setQuestions(toPicked(next.defaultQuestions));
    goToStep("questions");
  }

  function toggleQuestion(entry: QuestionCatalogEntry) {
    setQuestions((prev) => {
      const existing = prev.find((q) => q.questionType === entry.questionType);
      if (existing) return prev.filter((q) => q.key !== existing.key);
      if (prev.length >= MAX_QUESTIONS) return prev;
      return [
        ...prev,
        { key: nextKey(), questionType: entry.questionType, question: entry.question, characterLimit: entry.characterLimit },
      ];
    });
  }

  function saveQuestionDraft() {
    if (!questionDraft) return;
    const text = questionDraft.text.trim();
    if (!text) return;

    setQuestions((prev) => {
      if (questionDraft.key) return prev.map((q) => (q.key === questionDraft.key ? { ...q, question: text } : q));
      if (prev.length >= MAX_QUESTIONS) return prev;
      return [...prev, { key: nextKey(), questionType: "CUSTOM", question: text, characterLimit: 1000 }];
    });
    setQuestionDraft(null);
  }

  function handleCreate() {
    setError(null);
    startCreate(async () => {
      try {
        const detail = await createCoverLetterAction({
          templateId,
          title: title.trim() || undefined,
          resumeId,
          targetOccupationId,
          questions: questions.map((q) => ({
            questionType: q.questionType,
            question: q.question,
            characterLimit: q.characterLimit,
          })),
          experienceBankIds: selectedExperienceIds,
        });
        router.replace(`/cover-letter/${detail.coverLetter.id}/edit`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "자기소개서를 만들지 못했습니다.");
      }
    });
  }

  /* ── 양식 고르기 ───────────────────────────────────────────────────────── */

  if (step === "template") {
    return (
      <div>
        <div className="text-center">
          <Sparkles className="mx-auto size-8 text-brand-blue-400" />
          <h2 className="mt-5 text-title-2 font-extrabold text-slate-900 sm:text-headline-3">
            어떤 자기소개서를 만들까요?
          </h2>
          <p className="mt-3 text-body-2 font-medium text-slate-600">
            골라주시면 그에 맞는 문항을 미리 담아드려요. 문항은 다음 단계에서 바꿀 수 있어요.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {templates.map((t, idx) => {
            const style = TEMPLATE_CARD_STYLES[idx % TEMPLATE_CARD_STYLES.length];
            const Icon = style.icon;
            return (
              <div key={t.id} className="flex flex-col rounded-card bg-white p-5 text-center shadow-card sm:p-7">
                <div className="flex justify-center">
                  <span className={cn("flex size-14 items-center justify-center rounded-full", style.tone)}>
                    <Icon className={cn("size-7", style.iconTone)} />
                  </span>
                </div>
                <p className="mt-4 break-keep text-body-1 font-bold text-slate-900">{t.name}</p>
                {/* break-keep 이 없으면 한글이 음절 단위로 잘려 "자기소개 / 서입니다." 처럼 끊긴다. */}
                <p className="mt-2 flex-1 break-keep text-body-2 leading-relaxed font-medium text-slate-600">
                  {t.description}
                </p>
                <p className="mt-3 text-caption-1 font-medium text-slate-600">문항 {t.defaultQuestions.length}개</p>
                <Button
                  /* 좁은 화면에서는 카드 폭을 채운다. 가운데 뜬 작은 버튼은 손가락으로 겨누기 어렵다. */
                  className="mt-4 h-11 self-stretch rounded-full bg-atomic-blue-600 px-7 font-bold text-white sm:self-center"
                  onClick={() => startWithTemplate(t)}
                >
                  시작하기
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button variant="ghost" size="sm" className="text-body-3 text-slate-600" asChild>
            <Link href="/resume">
              <ArrowLeft className="size-4" /> 목록으로
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ── 1단계: 문항 고르기 ───────────────────────────────────────────────── */

  if (step === "questions") {
    const canGoNext = questions.length > 0;

    return (
      <>
        <WizardCard>
          <StepHeader
            step={1}
            title="문항 고르기"
            description="자기소개서에 담을 문항을 골라주세요. 나중에 편집 화면에서도 바꿀 수 있어요."
          />
          {/* 앞 화면에서 고른 양식. 지금 무엇을 바탕으로 담겨 있는지 알아야 문항을 손볼 수 있다. */}
          <p className="mt-4 text-center text-body-3 font-medium text-slate-600">
            고른 양식 <span className="font-semibold text-slate-700">{template.name}</span>
          </p>

          <div className="mt-10 space-y-8">
            <div>
              <FieldLabel hint={`고르면 아래 목록에 담깁니다. 최대 ${MAX_QUESTIONS}개까지 담을 수 있어요.`}>
                자기소개서 문항
              </FieldLabel>

              <div className="rounded-xl bg-baro-blue-50 p-4">
                <p className="text-body-3 font-semibold text-slate-700">추천 문항</p>
                <p className="mt-1 flex items-center gap-1 text-caption-1 font-medium text-slate-600">
                  <ThumbsUp className="size-3.5" /> 표시는 고르신 자기소개서에서 자주 묻는 문항이에요.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {catalog.map((entry) => {
                    const picked = questions.some((q) => q.questionType === entry.questionType);
                    const recommended = entry.templateCodes.includes(template.code);
                    const full = !picked && questions.length >= MAX_QUESTIONS;
                    return (
                      <button
                        key={entry.questionType}
                        type="button"
                        disabled={full}
                        onClick={() => toggleQuestion(entry)}
                        aria-pressed={picked}
                        className={cn(
                          /* 고른 문항은 파랑으로 채운다. 선만 바꾸면 고른 것과 안 고른 것이 잘 구별되지 않는다. */
                          "flex h-10 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-body-3 disabled:cursor-not-allowed disabled:opacity-40",
                          picked
                            ? "border-baro-blue bg-baro-blue font-bold text-white"
                            : "border-slate-300 bg-white font-medium text-slate-700",
                        )}
                      >
                        {recommended && <ThumbsUp className="size-3.5" />}
                        {entry.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 border-t border-brand-blue-100 pt-4">
                  <p className="text-body-3 font-medium text-slate-600">원하는 문항이 없다면 직접 적어보세요.</p>
                  <Button
                    variant="outline"
                    className="mt-2 h-12 w-full border-brand-blue-200 bg-white font-semibold text-brand-blue-700 hover:bg-white"
                    disabled={questions.length >= MAX_QUESTIONS}
                    onClick={() => setQuestionDraft({ key: null, text: "" })}
                  >
                    <Plus className="size-4" /> 문항 직접 쓰기
                  </Button>
                </div>
              </div>

              <div className="mt-4 divide-y divide-border rounded-xl border border-border">
                {questions.length === 0 ? (
                  <p className="p-5 text-center text-body-3 font-medium text-slate-600">
                    위에서 문항을 골라주세요. 한 개는 있어야 다음으로 갈 수 있어요.
                  </p>
                ) : (
                  questions.map((q, idx) => (
                    <div key={q.key} className="flex items-center gap-3 px-4 py-3">
                      <span className="shrink-0 text-body-3 font-bold text-slate-600">문항 {idx + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-body-3 font-medium text-slate-700">
                        {questionHeading(q.questionType, q.question)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-slate-600"
                        onClick={() => setQuestionDraft({ key: q.key, text: q.question })}
                      >
                        <Pencil className="size-3.5" /> 수정
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-slate-600"
                        onClick={() => setQuestions((prev) => prev.filter((p) => p.key !== q.key))}
                      >
                        <Trash2 className="size-3.5" /> 삭제
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <FieldLabel hint="비워두면 편집 화면에서 정할 수 있어요.">자기소개서 이름 (선택)</FieldLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 요양보호사 지원용 자기소개서"
                className="h-12 rounded-xl border-slate-300 bg-white text-body-2 font-medium md:text-body-2"
              />
            </div>
          </div>

          <div className="mt-10 flex justify-center gap-3">
            <Button variant="outline" className="h-12 min-w-32 rounded-full border-slate-300 bg-white font-semibold text-slate-800" onClick={() => goToStep("template")}>
              이전
            </Button>
            <Button className="h-12 min-w-32 rounded-full bg-atomic-blue-600 font-bold text-white" disabled={!canGoNext} onClick={() => goToStep("experiences")}>
              다음
            </Button>
          </div>
        </WizardCard>

        <Dialog open={questionDraft !== null} onOpenChange={(next) => !next && setQuestionDraft(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{questionDraft?.key ? "문항 수정하기" : "문항 직접 쓰기"}</DialogTitle>
              <DialogDescription>
                지원하는 곳에서 받은 질문을 그대로 옮겨 적으면 가장 좋아요.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              rows={3}
              value={questionDraft?.text ?? ""}
              onChange={(e) => setQuestionDraft((prev) => (prev ? { ...prev, text: e.target.value } : prev))}
              placeholder="예: 우리 기관에 지원하신 이유를 적어주세요."
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setQuestionDraft(null)}>
                취소
              </Button>
              <Button onClick={saveQuestionDraft} disabled={!questionDraft?.text.trim()}>
                {questionDraft?.key ? "수정 저장" : "문항 담기"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  /* ── 2단계: 내 경험 고르기 ────────────────────────────────────────────── */

  return (
    <>
      <WizardCard>
        <StepHeader
          step={2}
          title="자기소개서에 넣을 내 경험 고르기"
          description={"여기서 고른 경험을 재료로 AI가 문항별 초안을 써드려요.\n지금 없어도 괜찮아요. 편집 화면에서 언제든 더할 수 있어요."}
        />

        <div className="mt-10">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Label className="text-body-2 font-bold text-slate-900">내 경험뱅크</Label>
              <p className="mt-1 text-body-3 font-medium text-slate-600">
                {experiences.length > 0
                  ? `${experiences.length}개 중 ${selectedExperienceIds.length}개를 골랐어요.`
                  : "아직 정리해둔 경험이 없어요."}
              </p>
            </div>
            {/* 아무것도 없을 때는 아래 빈 상태에 큰 버튼이 있어, 여기까지 두면 같은 버튼이 둘이 된다. */}
            {experiences.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 bg-white font-semibold text-slate-800"
                onClick={() => setExperienceFormOpen(true)}
              >
                <Plus className="size-4" /> 내 경험 추가하기
              </Button>
            )}
          </div>

          {experiences.length === 0 ? (
            <div className="rounded-xl bg-gov-surface p-10 text-center">
              <p className="text-body-2 font-medium text-slate-600">
                일하며 겪은 일을 하나만 적어두면, AI가 그걸 자기소개서 문장으로 바꿔드려요.
              </p>
              <Button className="mt-4 h-12 rounded-full bg-atomic-blue-600 px-6 font-bold text-white" onClick={() => setExperienceFormOpen(true)}>
                <Plus className="size-4" /> 첫 경험 적어보기
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {experiences.map((exp) => {
                const selected = selectedExperienceIds.includes(exp.id);
                const summary = experienceSummary(exp);
                return (
                  <button
                    key={exp.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setSelectedExperienceIds((prev) =>
                        prev.includes(exp.id) ? prev.filter((id) => id !== exp.id) : [...prev, exp.id],
                      )
                    }
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-left",
                      selected
                        ? "border-brand-blue-600 bg-brand-blue-50"
                        : "border-border bg-white",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                        selected ? "border-brand-blue-600 bg-brand-blue-600" : "border-slate-300",
                      )}
                    >
                      {selected && <Check className="size-3.5 text-white" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-body-2 font-semibold text-slate-900">{exp.title}</span>
                      {summary && <span className="mt-0.5 block truncate text-body-3 font-medium text-slate-600">{summary}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {error && <p className="mt-4 text-center text-body-3 font-medium text-rose-600">{error}</p>}
        </div>

        <div className="mt-10 flex justify-center gap-3">
          <Button
            variant="outline"
            className="h-12 min-w-32 rounded-full border-slate-300 bg-white font-semibold text-slate-800"
            disabled={isCreating}
            onClick={() => goToStep("questions")}
          >
            이전
          </Button>
          <Button className="h-12 min-w-44 rounded-full bg-atomic-blue-600 font-bold text-white" disabled={isCreating} onClick={handleCreate}>
            {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            자기소개서 만들기
          </Button>
        </div>
      </WizardCard>

      <ExperienceFormDialog
        open={experienceFormOpen}
        onOpenChange={setExperienceFormOpen}
        editing={null}
        /* 방금 적은 경험은 쓰려고 적은 것이다. 담자마자 골라둔 상태로 둔다. */
        onSaved={(item) => {
          setExperiences((prev) => [item, ...prev]);
          setSelectedExperienceIds((prev) => [...prev, item.id]);
        }}
      />
    </>
  );
}
