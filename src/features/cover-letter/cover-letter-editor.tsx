"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { CoverLetterDetail, CoverLetterSectionInput, ExperienceBankItem } from "@/types";
import {
  deleteCoverLetterAction,
  generateCoverLetterDraftAiAction,
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

export function CoverLetterEditor({
  initialDetail,
  experienceBank,
}: {
  initialDetail: CoverLetterDetail;
  experienceBank: ExperienceBankItem[];
}) {
  const router = useRouter();
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
    } catch {
      setSaveMessage("AI 점검 중 오류가 발생했습니다.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDelete() {
    if (!window.confirm("이 자기소개서를 삭제하시겠습니까?")) return;
    await deleteCoverLetterAction(detail.coverLetter.id);
    router.push("/resume");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-border">
        <div className="min-w-0 flex-1">
          <Label className="text-xs text-slate-400">자기소개서 이름</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-9 max-w-xs" />
        </div>
        <div className="flex items-center gap-2">
          {saveMessage && <span className="text-xs text-slate-400">{saveMessage}</span>}
          <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            저장
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-0 ring-1 ring-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-500">
            {experienceBank.length > 0 ? "경험뱅크에서 문항별로 사용할 경험을 선택하세요" : "경험뱅크가 비어있어요"}
          </CardTitle>
          <Link href="/experience-bank" className="text-[13px] font-medium text-brand-blue-600 hover:underline">
            경험뱅크 관리 →
          </Link>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {sections.map((section, idx) => (
          <Card key={section._key} className="rounded-2xl border-0 ring-1 ring-border">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-400">문항 {idx + 1}</p>
                <Input
                  value={section.question}
                  onChange={(e) => updateSection(section._key, { question: e.target.value })}
                  className="mt-1 h-9 border-0 px-0 text-base font-bold shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => moveSection(section._key, -1)} disabled={idx === 0}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => moveSection(section._key, 1)} disabled={idx === sections.length - 1}>
                  <ArrowDown className="size-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSections((prev) => prev.filter((s) => s._key !== section._key))}>
                  <Trash2 className="size-4 text-slate-400" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={section.content ?? ""}
                onChange={(e) => updateSection(section._key, { content: e.target.value })}
                rows={6}
                placeholder="이 질문에 대한 답변을 작성해주세요."
              />
              <div className="flex items-center justify-between text-[12px] text-slate-400">
                <span>
                  {section.content?.length ?? 0}
                  {section.characterLimit ? ` / ${section.characterLimit}자` : "자"}
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-1 font-medium text-brand-blue-600 hover:underline disabled:opacity-50"
                    onClick={() => handleGenerateDraft(section)}
                    disabled={busyKey === section._key}
                  >
                    {busyKey === section._key ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                    AI 초안 생성
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 font-medium text-brand-blue-600 hover:underline disabled:opacity-50"
                    onClick={() => handleReviewSection(section)}
                    disabled={busyKey === `review-${section._key}`}
                  >
                    {busyKey === `review-${section._key}` ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                    AI 점검
                  </button>
                </div>
              </div>

              {experienceBank.length > 0 && (
                <div className="flex flex-wrap gap-2 rounded-lg bg-slate-50 p-3">
                  {experienceBank.map((exp) => {
                    const checked = (selectedExperiences[section._key] ?? []).includes(exp.id);
                    return (
                      <label key={exp.id} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] ring-1 ring-border">
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
                <div className="rounded-lg bg-brand-blue-50 p-3 text-[13px]">
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

      <Button
        variant="outline"
        onClick={() =>
          setSections((prev) => [
            ...prev,
            { _key: nextKey(), questionType: "CUSTOM", question: "새 문항을 입력해주세요.", content: "", orderIndex: prev.length },
          ])
        }
      >
        <Plus className="size-4" /> 문항 추가
      </Button>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="text-rose-500" onClick={handleDelete}>
          <Trash2 className="size-4" /> 자기소개서 삭제
        </Button>
        <div className="flex items-center gap-3">
          {detail.coverLetter.targetJobId && <Badge variant="outline">지원공고 연결됨</Badge>}
          <Link href="/resume" className="text-xs text-slate-400 hover:underline">
            목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}
