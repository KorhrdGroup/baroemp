"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Eye,
  Loader2,
  Plus,
  Printer,
  Repeat2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CoverLetterPreview } from "./cover-letter-preview";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AiButton } from "@/components/common/ai-button";
import { MarketComparisonCard } from "@/features/career-gap/market-comparison-card";
import { cn } from "@/lib/utils";
import type { CoverLetterDetail, CoverLetterSectionInput, ExperienceBankItem, ResumeMarketComparisonView } from "@/types";
import type { QuestionCatalogEntry } from "@/lib/cover-letter/questions";
import { questionHeading } from "@/lib/cover-letter/questions";
import {
  generateCoverLetterDraftAiAction,
  getCoverLetterMarketComparisonAction,
  reviewCoverLetterSectionAiAction,
  saveCoverLetterAction,
} from "./cover-letter-actions";

let keySeq = 0;
function nextKey() {
  keySeq += 1;
  return `cl-section-${keySeq}`;
}

type EditableSection = CoverLetterSectionInput & { _key: string };

/** 화면에서만 쓰는 _key를 뗀다. 서버에 보내는 값과 저장 여부를 재는 값 양쪽에서 쓴다. */
function stripKey(section: CoverLetterSectionInput & { _key?: string }): CoverLetterSectionInput {
  const rest = { ...section };
  delete rest._key;
  return rest;
}

/**
 * 저장에 보내는 값. 변경 여부 판단도 이 값으로 한다.
 * 판단용 데이터를 따로 만들면 저장 형식이 바뀔 때 둘이 어긋난다.
 */
function buildSavePayload(source: { id: string; title: string; sections: (CoverLetterSectionInput & { _key?: string })[] }) {
  return {
    coverLetter: { id: source.id, title: source.title },
    sections: source.sections.map(stripKey),
  };
}

export function CoverLetterEditor({
  initialDetail,
  experienceBank,
  catalog,
  applicantName,
}: {
  initialDetail: CoverLetterDetail;
  /** 회원의 경험뱅크 전체. 작성 시작 화면에서 고른 것만 재료로 올려두고, 나머지는 더 담기에서 꺼낸다. */
  experienceBank: ExperienceBankItem[];
  /** 고를 수 있는 문항 목록. 문항을 통째로 바꿀 때 쓴다. */
  catalog: QuestionCatalogEntry[];
  /** 미리보기 문서에 찍는 지원자 이름. 편집 폼에는 쓰지 않는다. */
  applicantName?: string;
}) {
  const [detail, setDetail] = useState(initialDetail);
  const [title, setTitle] = useState(initialDetail.coverLetter.title);
  const [sections, setSections] = useState<EditableSection[]>(
    initialDetail.sections.map((s) => ({ ...s, _key: nextKey() })),
  );
  /** 한 번에 한 문항만 보여준다. 다섯 문항이 한 화면에 늘어서면 어디부터 쓸지 정하다 지친다. */
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [selectedExperiences, setSelectedExperiences] = useState<Record<string, string[]>>({});
  const [isSaving, startSave] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, { text: string; prompts: string[] }>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [confirmingDeleteKey, setConfirmingDeleteKey] = useState<string | null>(null);
  /** 마지막으로 저장한 내용. 지금 입력과 이 값을 비교해 저장할 것이 있는지 본다. */
  const [savedPayload, setSavedPayload] = useState(() =>
    JSON.stringify(
      buildSavePayload({
        id: initialDetail.coverLetter.id,
        title: initialDetail.coverLetter.title,
        sections: initialDetail.sections,
      }),
    ),
  );
  const [marketComparison, setMarketComparison] = useState<ResumeMarketComparisonView | null>(null);
  const marketComparisonRequestedRef = useRef(false);

  /*
    재료로 올려둘 경험. 작성 시작 화면에서 고른 것만 쓴다.
    그 전에 만든 자기소개서는 고른 기록이 없으므로 경험뱅크 전체를 그대로 쓴다.
  */
  const pickedIds = detail.coverLetter.experienceBankIds ?? [];
  const experiencePool = pickedIds.length > 0
    ? experienceBank.filter((e) => pickedIds.includes(e.id))
    : experienceBank;

  // 삭제 등으로 활성 문항이 사라졌으면 첫 문항으로 돌아온다.
  const active = sections.find((s) => s._key === activeKey) ?? sections[0];
  const activeIndex = active ? sections.findIndex((s) => s._key === active._key) : -1;

  function handleSave() {
    return new Promise<void>((resolve, reject) => {
      startSave(async () => {
        try {
          const saved = await saveCoverLetterAction(
            buildSavePayload({ id: detail.coverLetter.id, title, sections }),
          );
          setDetail(saved);
          /*
            _key 는 그대로 두고 서버가 돌려준 값만 덮어쓴다. 저장할 때마다 새로 매기면
            지금 보던 문항, 문항별로 띄워둔 AI 결과, 골라둔 경험이 전부 옛 키에 남아
            화면에서 사라진다. 문항은 순서대로 다시 오므로 자리끼리 짝지으면 된다.
          */
          const ordered = [...saved.sections].sort((a, b) => a.orderIndex - b.orderIndex);
          setSections((prev) => ordered.map((s, i) => ({ ...s, _key: prev[i]?._key ?? nextKey() })));
          /*
            기준점은 화면 상태가 아니라 서버가 돌려준 값으로 잡는다. 이 시점에는
            위 setState 들이 아직 반영되기 전이라, 화면 상태로 찍으면 서버가 새로
            부여한 문항 id 가 빠진 값이 기준점이 된다.
          */
          setSavedPayload(
            JSON.stringify(
              buildSavePayload({
                id: saved.coverLetter.id,
                title: saved.coverLetter.title,
                sections: saved.sections,
              }),
            ),
          );
          setSaveMessage("저장 완료");
          resolve();
        } catch (err) {
          setSaveMessage(err instanceof Error ? err.message : "저장에 실패했습니다.");
          reject(err);
        }
      });
    });
  }

  function updateSection(key: string, patch: Partial<EditableSection>) {
    setSections((prev) => prev.map((s) => (s._key === key ? { ...s, ...patch } : s)));
  }

  function moveSection(key: string, direction: -1 | 1) {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s._key === key);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((s, i) => ({ ...s, orderIndex: i }));
    });
  }

  function addSection() {
    const key = nextKey();
    setSections((prev) => [
      ...prev,
      { _key: key, questionType: "CUSTOM", question: "새 문항을 입력해주세요.", content: "", orderIndex: prev.length },
    ]);
    setActiveKey(key);
  }

  function deleteSection(key: string) {
    setConfirmingDeleteKey(null);
    setSections((prev) => prev.filter((s) => s._key !== key).map((s, i) => ({ ...s, orderIndex: i })));
    if (activeKey === key) setActiveKey(null);
  }

  /** 이 문항에 쓸 경험. 아직 손대지 않았으면 고른 경험 전부를 쓴다. */
  function experienceIdsFor(section: EditableSection): string[] {
    return selectedExperiences[section._key] ?? experiencePool.map((e) => e.id);
  }

  async function handleGenerateDraft(section: EditableSection) {
    const experienceIds = experienceIdsFor(section);
    // 경험뱅크에 담긴 게 있는데 이 문항에서 전부 뺀 경우에만 막는다.
    // 애초에 비어 있으면(대부분의 사용자) 서버가 이력서 경력을 재료로 대신 쓴다.
    if (experiencePool.length > 0 && experienceIds.length === 0) {
      setSuggestions((prev) => ({
        ...prev,
        [section._key]: { text: "", prompts: ["초안을 쓰려면 아래에서 이 문항에 쓸 경험을 하나 이상 골라주세요."] },
      }));
      return;
    }
    setBusyKey(section._key);
    try {
      await handleSave();
      const candidates = experienceBank
        .filter((e) => experienceIds.includes(e.id))
        .map((e) => ({ title: e.title, situation: e.situation, task: e.task, action: e.action, result: e.result }));
      const result = await generateCoverLetterDraftAiAction({
        coverLetterId: detail.coverLetter.id,
        question: section.question,
        questionType: section.questionType,
        characterLimit: section.characterLimit,
        candidateExperiences: candidates,
      });
      setSuggestions((prev) => ({ ...prev, [section._key]: { text: result.draft, prompts: result.missingInformationPrompts } }));
    } catch {
      setSaveMessage("AI 초안 생성 중 오류가 발생했습니다.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleReviewSection(section: EditableSection) {
    if (!section.content?.trim()) return;
    setBusyKey(`review-${section._key}`);
    try {
      await handleSave();
      const result = await reviewCoverLetterSectionAiAction({
        coverLetterId: detail.coverLetter.id,
        question: section.question,
        content: section.content,
      });
      setSuggestions((prev) => ({
        ...prev,
        [section._key]: {
          text: "",
          prompts: [...result.strengths.map((s) => `[잘함] ${s}`), ...result.improvements.map((i) => `[보완] ${i.comment}`)],
        },
      }));
      if (!marketComparisonRequestedRef.current) {
        marketComparisonRequestedRef.current = true;
        void getCoverLetterMarketComparisonAction(detail.coverLetter.id)
          .then(setMarketComparison)
          .catch(() => setMarketComparison(null));
      }
    } catch {
      setSaveMessage("AI 점검 중 오류가 발생했습니다.");
    } finally {
      setBusyKey(null);
    }
  }

  /** 저장 전 상태 그대로 보여준다. 저장해야만 미리보기가 맞는 건 불편하다. */
  function currentPreviewDetail(): CoverLetterDetail {
    return {
      ...detail,
      coverLetter: { ...detail.coverLetter, title },
      sections: sections.map((sec, idx) => ({
        ...sec,
        id: sec._key,
        coverLetterId: detail.coverLetter.id,
        content: sec.content ?? "",
        orderIndex: sec.orderIndex ?? idx,
      })),
    } as CoverLetterDetail;
  }

  /**
   * 팝업 오버레이가 인쇄물에 끼지 않도록 닫힘 애니메이션이 끝난 뒤 인쇄한다.
   * 인쇄되는 문서는 팝업 속 미리보기가 아니라 아래에 늘 숨겨둔 인쇄 전용 사본이다
   * (이력서와 같은 방식) - 팝업을 닫아도 인쇄물이 비지 않는 이유.
   */
  function handlePopupPrint() {
    setPreviewOpen(false);
    setTimeout(() => window.print(), 200);
  }

  // 진행률은 답을 쓴 문항 수로 센다. 화면에서 바로 세어지는 값이라 설명이 필요 없다.
  const writtenCount = sections.filter((sec) => sec.content?.trim()).length;
  const writtenRatio = sections.length > 0 ? Math.round((writtenCount / sections.length) * 100) : 0;
  const firstEmptyIndex = sections.findIndex((sec) => !sec.content?.trim());

  /*
    마지막으로 저장한 내용과 지금 입력이 같으면 저장할 것이 없다.
    누를 수는 있는데 아무 일도 안 일어나면 저장이 안 된 건지 헷갈린다.
  */
  const isDirty =
    JSON.stringify(buildSavePayload({ id: detail.coverLetter.id, title, sections })) !== savedPayload;

  const suggestion = active ? suggestions[active._key] : undefined;

  return (
    <div className="space-y-4">
      {/*
        좁은 화면용 문항 띠. 문항 목록 상자는 위로 올라가 본문을 쓰는 동안 사라져,
        다음 문항으로 건너갈 길이 없었다. 이력서 편집과 같은 자리(헤더 밑)에 붙인다.
        본문은 한 문항씩 갈아끼우는 방식이라 누르면 그 문항으로 바뀐다.
      */}
      <div className="scrollbar-hidden sticky top-16 z-30 -mx-4.5 -mt-10 mb-2 flex items-center gap-1 overflow-x-auto border-b border-border bg-white/95 px-4.5 py-2 backdrop-blur lg:hidden">
        {sections.map((section, idx) => {
          const written = Boolean(section.content?.trim());
          const isActive = section._key === active?._key;
          return (
            <button
              key={section._key}
              type="button"
              data-strip-key={section._key}
              onClick={() => setActiveKey(section._key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-label-1 whitespace-nowrap transition-colors",
                isActive ? "bg-brand-blue-50 font-semibold text-brand-blue-600" : "font-medium text-slate-500",
              )}
            >
              {written ? (
                <Check className="size-3.5 text-brand-blue-600" />
              ) : (
                <span className="text-label-2 font-bold text-slate-400">{idx + 1}</span>
              )}
              {questionHeading(section.questionType, section.question)}
            </button>
          );
        })}
        <button
          type="button"
          onClick={addSection}
          aria-label="문항 추가"
          className="flex shrink-0 items-center rounded-lg border border-border p-2 text-slate-500"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-white p-4">
        <div className="min-w-48 flex-1">
          <Label className="text-label-2 text-slate-400">자기소개서 이름</Label>
          <Input
            placeholder="제목을 입력해주세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 h-10 bg-white"
          />
        </div>
        {detail.coverLetter.targetJobId && <Badge variant="outline">지원공고 연결됨</Badge>}
      </div>

      {/*
        왼쪽은 문항 목록, 오른쪽은 지금 쓰는 문항 하나.
        좁은 화면에서는 목록이 위로 올라가 가로로 눕는다.
      */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <nav className="hidden rounded-xl bg-white p-3 lg:sticky lg:top-24 lg:block lg:w-60 lg:shrink-0">
          <p className="px-2 pb-2 text-label-2 font-semibold text-slate-400">문항 {sections.length}개</p>
          <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {sections.map((section, idx) => {
              const written = Boolean(section.content?.trim());
              const isActive = section._key === active?._key;
              return (
                <li key={section._key} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => setActiveKey(section._key)}
                    aria-current={isActive}
                    className={cn(
                      // 좁은 화면에서는 가로로 눕는 줄이라, 이름이 길면 한 칸이 화면을 다 먹는다.
                      "flex w-full max-w-36 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-label-1 transition-colors lg:max-w-none",
                      isActive ? "bg-brand-blue-50 font-semibold text-brand-blue-700" : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-label-2 font-bold",
                        written
                          ? "bg-brand-blue-600 text-white"
                          : isActive
                            ? "bg-white text-brand-blue-700 ring-1 ring-brand-blue-200"
                            : "bg-slate-100 text-slate-400",
                      )}
                    >
                      {written ? <Check className="size-3.5" /> : idx + 1}
                    </span>
                    <span className="truncate">{questionHeading(section.questionType, section.question)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start text-slate-600" onClick={addSection}>
            <Plus className="size-4" /> 문항 추가
          </Button>
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          {active && (
            <div className="rounded-xl bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-label-2 font-semibold text-slate-400">문항 {activeIndex + 1}</p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="text-slate-500" onClick={() => setSwapOpen(true)}>
                    <Repeat2 className="size-3.5" /> 문항 바꾸기
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="위로 이동"
                    onClick={() => moveSection(active._key, -1)}
                    disabled={activeIndex === 0}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="아래로 이동"
                    onClick={() => moveSection(active._key, 1)}
                    disabled={activeIndex === sections.length - 1}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="문항 삭제"
                    onClick={() => setConfirmingDeleteKey(active._key)}
                  >
                    <Trash2 className="size-4 text-slate-400" />
                  </Button>
                </div>
              </div>

              {/*
                문항이 길면 접혀야 한다. Input 은 한 줄이라 좁은 화면에서 끝이 잘렸다.
                Textarea 는 field-sizing-content 라 내용만큼 늘어난다.
              */}
              <Textarea
                value={active.question}
                onChange={(e) => updateSection(active._key, { question: e.target.value })}
                rows={1}
                /*
                  좁은 화면에서는 두 줄로 접히는 일이 잦아 한 단계 줄인다(16px -> 넓은 화면 18px).
                  답 칸과 사이도 좀 벌린다 - 접힌 제목과 붙으면 한 덩어리로 읽힌다.
                */
                className="mt-1 mb-2 min-h-0 resize-none break-keep rounded-none border-0 bg-transparent p-0 text-body-2 font-semibold shadow-none focus-visible:ring-0 md:mb-0 md:text-body-1"
              />

              {/*
                Textarea 는 field-sizing-content 라 rows 를 무시하고 내용만큼만 커진다.
                빈 칸이 두 줄짜리로 보이면 한 문단 쓰는 자리로 안 읽혀서 최소 높이를 직접 준다.
                글자도 기본값(md:text-label-1, 14px)이면 길게 쓰는 칸치고 작아 16px로 올린다.
              */}
              <Textarea
                className="mt-2 min-h-80 bg-white text-body-2 leading-relaxed md:text-body-2"
                value={active.content ?? ""}
                onChange={(e) => updateSection(active._key, { content: e.target.value })}
                placeholder="이 질문에 대한 답변을 작성해주세요."
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-label-2 text-slate-400">
                <span>
                  {active.content?.length ?? 0}
                  {active.characterLimit ? ` / ${active.characterLimit}자` : "자"}
                </span>
                <div className="flex gap-2">
                  <AiButton size="xs" onClick={() => handleGenerateDraft(active)} loading={busyKey === active._key}>
                    AI 초안 만들기
                  </AiButton>
                  <AiButton
                    size="xs"
                    onClick={() => handleReviewSection(active)}
                    loading={busyKey === `review-${active._key}`}
                    /* 다듬을 글이 없으면 누를 수 없다. 빈 칸에서 눌러도 할 일이 없다. */
                    disabled={!active.content?.trim()}
                  >
                    AI로 다듬기
                  </AiButton>
                </div>
              </div>

              {suggestion && (
                <div className="mt-3 rounded-lg bg-brand-blue-50 p-3 text-label-1">
                  {suggestion.text && (
                    <>
                      <p className="whitespace-pre-line text-slate-700">{suggestion.text}</p>
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          updateSection(active._key, { content: suggestion.text });
                          setSuggestions((prev) => {
                            const next = { ...prev };
                            delete next[active._key];
                            return next;
                          });
                        }}
                      >
                        적용
                      </Button>
                    </>
                  )}
                  {suggestion.prompts.length > 0 && (
                    <ul className="mt-2 list-disc pl-4 text-slate-600">
                      {suggestion.prompts.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/*
            AI 초안의 재료. 작성 시작 화면에서 고른 경험을 그대로 올려두고,
            이 문항에 안 맞는 것만 빼게 한다. 매번 고르게 하면 초안 한 번 받기까지 손이 많이 간다.
          */}
          {active && (
            <div className="rounded-xl bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-label-1 font-semibold text-slate-900">이 문항에 쓸 내 경험</p>
                  <p className="mt-0.5 text-label-2 text-slate-500">
                    {experiencePool.length > 0
                      ? "고른 경험을 재료로 AI가 초안을 씁니다. 이 문항과 안 맞는 것은 빼주세요."
                      : "따로 정리한 경험이 없으면 이력서에 쓰신 경력을 재료로 초안을 만들어드려요."}
                  </p>
                </div>
                <Link
                  href="/resume#experience-bank"
                  className="text-label-1 font-medium text-brand-blue-600 hover:underline"
                >
                  경험뱅크 관리 →
                </Link>
              </div>

              {experiencePool.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {experiencePool.map((exp) => {
                    const checked = experienceIdsFor(active).includes(exp.id);
                    return (
                      <button
                        key={exp.id}
                        type="button"
                        aria-pressed={checked}
                        onClick={() =>
                          setSelectedExperiences((prev) => {
                            const current = prev[active._key] ?? experiencePool.map((e) => e.id);
                            return {
                              ...prev,
                              [active._key]: checked ? current.filter((id) => id !== exp.id) : [...current, exp.id],
                            };
                          })
                        }
                        className={cn(
                          "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-label-1 transition-colors",
                          checked
                            ? "border-brand-blue-400 bg-brand-blue-50 font-medium text-brand-blue-700"
                            : "border-border bg-white text-slate-600 hover:border-brand-blue-200",
                        )}
                      >
                        {checked && <Check className="size-3.5" />}
                        {exp.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {marketComparison && (
            <MarketComparisonCard
              key={marketComparison.analysisId ?? "no-analysis"}
              view={marketComparison}
              source="cover_letter_review"
            />
          )}
        </div>
      </div>

      {/*
        이력서 편집기와 동일한 구조. 왼쪽은 문서를 벗어나는 동작(목록으로), 오른쪽은 확정 동작인
        저장만 채운다. 화면 전체 폭에 고정해야 해서 sticky가 아니라 fixed다.
        삭제는 이력서와 같이 목록에서만 한다.
      */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-white/95 backdrop-blur">
        {/* 좁은 화면에서는 셋이 한 줄에 안 들어가 왼쪽 버튼이 잘렸다. 남는 자리를 가운데가 먹게 둔다. */}
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4.5 py-3 lg:px-8">
          <Button variant="outline" size="sm" className="shrink-0 text-slate-500" asChild>
            <Link href="/resume">
              <ArrowLeft className="size-4" /> 목록으로
            </Link>
          </Button>
          {/*
            이력서와 같은 자리에 진행 막대를 둔다. 자기소개서에는 완성도 점수가
            없으므로 "답을 쓴 문항 수"를 그대로 쓴다. 남은 문항 번호를 함께 적어
            다음에 무엇을 채울지 알게 한다.
          */}
          <div className="mx-4 hidden min-w-0 flex-1 sm:block">
            <div className="flex items-center justify-between gap-2 text-label-2">
              <span className="truncate text-slate-500">
                {firstEmptyIndex >= 0 ? `다음: 문항 ${firstEmptyIndex + 1}` : "모든 문항을 채웠어요"}
              </span>
              <span className="shrink-0 font-semibold text-slate-600">
                {writtenCount}/{sections.length}문항
              </span>
            </div>
            <Progress value={writtenRatio} className="mt-1 h-1.5" />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {saveMessage && <span className="text-label-2 text-slate-400">{saveMessage}</span>}
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="size-4" /> 미리보기
            </Button>
            {/* 넓은 화면에서만 넉넉히 잡는다. 좁은 화면에서는 이 폭 때문에 줄이 넘쳤다. */}
            <Button size="sm" className="sm:min-w-40" onClick={() => void handleSave()} disabled={isSaving || !isDirty}>
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {isSaving || isDirty ? "저장" : "저장됨"}
            </Button>
          </div>
        </div>
      </div>

      {/* 인쇄 전용 사본. 평소엔 숨겨두고 인쇄할 때만 이것이 출력된다 (이력서와 동일). */}
      <div className="hidden print:block">
        <CoverLetterPreview detail={currentPreviewDetail()} applicantName={applicantName} />
      </div>

      {/* 이력서와 같은 방식. 입력 폭을 좁히지 않도록 팝업으로 띄우고 인쇄로 PDF 저장한다. */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="print:hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>미리보기</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto rounded-xl bg-slate-100 p-4 ring-1 ring-border">
            <CoverLetterPreview detail={currentPreviewDetail()} applicantName={applicantName} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handlePopupPrint}>
              <Printer className="size-4" /> PDF로 저장/인쇄
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 문항 통째로 바꾸기. 쓴 내용은 그대로 두고 질문만 갈아끼운다. */}
      <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>어떤 문항으로 바꿀까요?</DialogTitle>
            <DialogDescription>
              이미 쓴 내용은 지워지지 않아요. 질문만 바뀝니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {catalog.map((entry) => {
              const used = sections.some((s) => s.questionType === entry.questionType && s._key !== active?._key);
              return (
                <button
                  key={entry.questionType}
                  type="button"
                  disabled={used}
                  onClick={() => {
                    if (!active) return;
                    updateSection(active._key, {
                      questionType: entry.questionType,
                      question: entry.question,
                      characterLimit: entry.characterLimit,
                    });
                    setSwapOpen(false);
                  }}
                  className={cn(
                    "w-full cursor-pointer rounded-xl border border-border px-4 py-3 text-left transition-colors hover:border-brand-blue-200 disabled:cursor-not-allowed disabled:opacity-40",
                    active?.questionType === entry.questionType && "border-brand-blue-600 bg-brand-blue-50",
                  )}
                >
                  <p className="text-body-2 font-semibold text-slate-900">{entry.label}</p>
                  <p className="mt-0.5 text-label-1 text-slate-500">
                    {used ? "이미 담긴 문항이에요." : entry.question}
                  </p>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmingDeleteKey !== null}
        onOpenChange={(next) => !next && setConfirmingDeleteKey(null)}
        title="이 문항을 삭제할까요?"
        description="문항에 쓴 내용도 함께 사라집니다."
        pending={false}
        onConfirm={() => confirmingDeleteKey && deleteSection(confirmingDeleteKey)}
      />
    </div>
  );
}
