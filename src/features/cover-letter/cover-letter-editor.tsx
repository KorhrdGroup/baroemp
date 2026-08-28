"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Eye, FileText, Loader2, Plus, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PillPicker } from "@/components/common/pill-picker";
import { CoverLetterPreview } from "./cover-letter-preview";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AiButton } from "@/components/common/ai-button";
import { MarketComparisonCard } from "@/features/career-gap/market-comparison-card";
import type { CoverLetterDetail, CoverLetterSectionInput, ExperienceBankItem, ResumeMarketComparisonView } from "@/types";
import {
  changeCoverLetterTemplateAction,
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

function stripKey<T extends { _key: string }>(item: T): Omit<T, "_key"> {
  const rest: Record<string, unknown> = { ...item };
  delete rest._key;
  return rest as Omit<T, "_key">;
}

export interface CoverLetterTemplateOption {
  id: string;
  name: string;
  description?: string;
  /** "문항 5개" 같은 부가 정보 */
  hint?: string;
}

export function CoverLetterEditor({
  initialDetail,
  experienceBank,
  templates = [],
  applicantName,
}: {
  initialDetail: CoverLetterDetail;
  experienceBank: ExperienceBankItem[];
  templates?: CoverLetterTemplateOption[];
  /** 미리보기 문서에 찍는 지원자 이름. 편집 폼에는 쓰지 않는다. */
  applicantName?: string;
}) {
  const [detail, setDetail] = useState(initialDetail);
  const [title, setTitle] = useState(initialDetail.coverLetter.title);
  const [sections, setSections] = useState<EditableSection[]>(
    initialDetail.sections.map((s) => ({ ...s, _key: nextKey() })),
  );
  const [selectedExperiences, setSelectedExperiences] = useState<Record<string, string[]>>({});
  const [isSaving, startSave] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, { text: string; prompts: string[] }>>({});
  const [isChangingTemplate, startTemplateChange] = useTransition();
  // 양식을 바꾸면 새 양식에 없는 문항의 답이 사라져 먼저 확인을 받는다.
  const [confirmingTemplateId, setConfirmingTemplateId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [marketComparison, setMarketComparison] = useState<ResumeMarketComparisonView | null>(null);
  const marketComparisonRequestedRef = useRef(false);

  /**
   * 이력서와 달리 자기소개서는 양식이 문항 세트 자체를 정의한다.
   * 같은 questionType의 답변은 서비스에서 새 문항으로 옮겨 담지만,
   * 새 양식에 없는 문항의 답변은 사라지므로 먼저 확인을 받는다.
   */
  function handleTemplateChange(templateId: string) {
    if (templateId === detail.coverLetter.templateId) return;

    // 쓴 내용이 있으면 먼저 확인을 받는다. 없으면 잃을 것이 없어 바로 바꾼다.
    if (sections.some((s) => s.content?.trim())) {
      setConfirmingTemplateId(templateId);
      return;
    }
    applyTemplateChange(templateId);
  }

  function applyTemplateChange(templateId: string) {
    const coverLetter = detail.coverLetter;
    const written = sections.filter((s) => s.content?.trim());
    setConfirmingTemplateId(null);

    startTemplateChange(async () => {
      // 답변 이관은 서버에 저장된 내용을 기준으로 한다.
      // 먼저 저장하지 않으면 화면에서 방금 쓴 내용이 그대로 사라진다.
      if (written.length > 0) await handleSave();
      const next = await changeCoverLetterTemplateAction(coverLetter.id, templateId);
      if (!next) return;
      setDetail(next);
      setSections(next.sections.map((s) => ({ ...s, _key: nextKey() })));
      setSuggestions({});
      setSelectedExperiences({});
    });
  }

  function handleSave() {
    return new Promise<void>((resolve, reject) => {
      startSave(async () => {
        try {
          const saved = await saveCoverLetterAction({
            coverLetter: { id: detail.coverLetter.id, title },
            sections: sections.map(stripKey),
          });
          setDetail(saved);
          setSections(saved.sections.map((s) => ({ ...s, _key: nextKey() })));
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

  async function handleGenerateDraft(section: EditableSection) {
    const experienceIds = selectedExperiences[section._key] ?? [];
    if (experienceIds.length === 0) {
      setSuggestions((prev) => ({
        ...prev,
        [section._key]: { text: "", prompts: ["이 질문에 사용할 경험을 아래 경험뱅크에서 선택해주세요."] },
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

  /** 팝업 오버레이가 인쇄물에 끼지 않도록 닫힘 애니메이션이 끝난 뒤 인쇄한다. */
  function handlePopupPrint() {
    setPreviewOpen(false);
    setTimeout(() => window.print(), 200);
  }

  // 진행률은 답을 쓴 문항 수로 센다. 화면에서 바로 세어지는 값이라 설명이 필요 없다.
  const writtenCount = sections.filter((sec) => sec.content?.trim()).length;
  const writtenRatio = sections.length > 0 ? Math.round((writtenCount / sections.length) * 100) : 0;
  const firstEmptyIndex = sections.findIndex((sec) => !sec.content?.trim());

  return (
    // 설정 줄(양식 선택)과 문서 사이만 넓게 띄운다. 이력서 편집과 같은 간격.
    <div className="space-y-6">
      <PillPicker
        label="자기소개서 양식"
        icon={<FileText className="size-4 text-brand-blue-600" />}
        options={templates.map((t) => ({
          id: t.id,
          name: t.name,
          description: [t.description, t.hint].filter(Boolean).join(" · ") || undefined,
        }))}
        value={detail.coverLetter.templateId ?? undefined}
        onChange={handleTemplateChange}
        pending={isChangingTemplate}
      />

      <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4">
        <div className="min-w-48 flex-1">
          <Label className="text-label-2 text-slate-400">자기소개서 이름</Label>
          <Input
            placeholder="제목을 입력해주세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 h-10 bg-white"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-4">
        <p className="text-label-1 text-slate-500">
          {experienceBank.length > 0 ? "경험뱅크에서 문항별로 사용할 경험을 선택하세요" : "경험뱅크가 비어있어요"}
        </p>
        <Link href="/resume#experience-bank" className="text-label-1 font-medium text-brand-blue-600 hover:underline">
          경험뱅크 관리 →
        </Link>
      </div>

      <div className="space-y-4">
        {sections.map((section, idx) => (
          <Card key={section._key} className="rounded-xl border-0 ring-0">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-label-2 font-semibold text-slate-400">문항 {idx + 1}</p>
                <Input
                  value={section.question}
                  onChange={(e) => updateSection(section._key, { question: e.target.value })}
                  /*
                    Input 기본 클래스에 md:text-label-1 이 있어 넓은 화면에서는
                    그쪽이 이긴다. 반응형 단계까지 함께 지정해야 크기가 적용된다.
                  */
                  className="mt-1 h-11 border-0 bg-transparent px-0 text-body-1 font-semibold shadow-none focus-visible:ring-0 md:text-body-1"
                />
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" aria-label="위로 이동" onClick={() => moveSection(section._key, -1)} disabled={idx === 0}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="아래로 이동" onClick={() => moveSection(section._key, 1)} disabled={idx === sections.length - 1}>
                  <ArrowDown className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="문항 삭제" onClick={() => setSections((prev) => prev.filter((s) => s._key !== section._key))}>
                  <Trash2 className="size-4 text-slate-400" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                className="bg-white"
                value={section.content ?? ""}
                onChange={(e) => updateSection(section._key, { content: e.target.value })}
                rows={6}
                placeholder="이 질문에 대한 답변을 작성해주세요."
              />
              <div className="flex items-center justify-between text-label-2 text-slate-400">
                <span>
                  {section.content?.length ?? 0}
                  {section.characterLimit ? ` / ${section.characterLimit}자` : "자"}
                </span>
                <div className="flex gap-2">
                  <AiButton
                    size="xs"
                    onClick={() => handleGenerateDraft(section)}
                    loading={busyKey === section._key}
                  >
                    AI 초안 생성
                  </AiButton>
                  <AiButton
                    size="xs"
                    onClick={() => handleReviewSection(section)}
                    loading={busyKey === `review-${section._key}`}
                  >
                    AI 점검
                  </AiButton>
                </div>
              </div>

              {experienceBank.length > 0 && (
                <div className="flex flex-wrap gap-2 rounded-lg bg-slate-50 p-3">
                  {experienceBank.map((exp) => {
                    const checked = (selectedExperiences[section._key] ?? []).includes(exp.id);
                    return (
                      <label key={exp.id} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-label-2 ring-1 ring-border">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            setSelectedExperiences((prev) => {
                              const current = prev[section._key] ?? [];
                              return {
                                ...prev,
                                [section._key]: v ? [...current, exp.id] : current.filter((id) => id !== exp.id),
                              };
                            })
                          }
                        />
                        {exp.title}
                      </label>
                    );
                  })}
                </div>
              )}

              {suggestions[section._key] && (
                <div className="rounded-lg bg-brand-blue-50 p-3 text-label-1">
                  {suggestions[section._key].text && (
                    <>
                      <p className="whitespace-pre-line text-slate-700">{suggestions[section._key].text}</p>
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          updateSection(section._key, { content: suggestions[section._key].text });
                          setSuggestions((prev) => {
                            const next = { ...prev };
                            delete next[section._key];
                            return next;
                          });
                        }}
                      >
                        적용
                      </Button>
                    </>
                  )}
                  {suggestions[section._key].prompts.length > 0 && (
                    <ul className="mt-2 list-disc pl-4 text-slate-600">
                      {suggestions[section._key].prompts.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {marketComparison && (
        <MarketComparisonCard
          key={marketComparison.analysisId ?? "no-analysis"}
          view={marketComparison}
          source="cover_letter_review"
        />
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          setSections((prev) => [
            ...prev,
            { _key: nextKey(), questionType: "CUSTOM", question: "새 문항을 입력해주세요.", content: "", orderIndex: prev.length },
          ])
        }
      >
        <Plus className="size-4" /> 문항 추가
      </Button>
      </div>

      {/*
        이력서 편집기와 동일한 구조. 왼쪽은 문서를 벗어나는 동작(목록으로)이라 ghost로 눌러두고,
        오른쪽은 확정 동작인 저장만 채운다. 화면 전체 폭에 고정해야 해서 sticky가 아니라 fixed다.
        삭제는 편집 화면이 아니라 자기소개서 목록에서 처리한다.
      */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-1 px-4 py-3 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" className="shrink-0 text-slate-500" asChild>
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
            {detail.coverLetter.targetJobId && <Badge variant="outline">지원공고 연결됨</Badge>}
            {saveMessage && <span className="text-label-2 text-slate-400">{saveMessage}</span>}
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="size-4" /> 미리보기
            </Button>
            <Button size="sm" className="min-w-40" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              저장
            </Button>
          </div>
        </div>
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

      <ConfirmDialog
        open={confirmingTemplateId !== null}
        onOpenChange={(next) => !next && setConfirmingTemplateId(null)}
        title="양식을 바꿀까요?"
        description="같은 종류의 문항에 쓴 내용은 그대로 옮겨지지만, 새 양식에 없는 문항의 내용은 사라집니다."
        confirmLabel="양식 바꾸기"
        pending={isChangingTemplate}
        onConfirm={() => confirmingTemplateId && applyTemplateChange(confirmingTemplateId)}
      />
    </div>
  );
}
