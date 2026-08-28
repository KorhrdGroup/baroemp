"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ExperienceBankItem } from "@/types";
import { createExperienceBankItemAction, updateExperienceBankItemAction } from "./experience-bank-actions";

const EMPTY_FORM = { title: "", situation: "", task: "", action: "", result: "" };
type FormState = typeof EMPTY_FORM;

/** STAR 용어를 노출하지 않고 쉬운 질문으로 입력받는다 (스펙 35번). */
const FIELDS: { key: keyof Omit<FormState, "title">; label: string }[] = [
  { key: "situation", label: "어떤 상황이었나요?" },
  { key: "task", label: "어떤 역할/과제를 맡았나요?" },
  { key: "action", label: "무엇을 했나요?" },
  { key: "result", label: "결과는 어땠나요? (숫자가 없어도 괜찮아요)" },
];

function toForm(item: ExperienceBankItem | null): FormState {
  if (!item) return EMPTY_FORM;
  return {
    title: item.title,
    situation: item.situation ?? "",
    task: item.task ?? "",
    action: item.action ?? "",
    result: item.result ?? "",
  };
}

/**
 * 경험 하나를 추가/수정하는 창.
 *
 * 이력서 화면의 경험뱅크 목록과 자기소개서 작성 시작 화면 양쪽에서 쓴다.
 * 같은 입력을 두 벌 두면 질문 문구가 갈라지므로 창 하나만 두고 부르는 쪽이 결과를 받는다.
 */
export function ExperienceFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null이면 새로 추가, 값이 있으면 그 항목 수정 */
  editing: ExperienceBankItem | null;
  onSaved: (item: ExperienceBankItem, isNew: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(editing));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  /*
    창을 열 때마다 폼을 다시 채운다. editing 을 effect 로 따라가면 창이 닫히는 도중에도
    값이 바뀌어 사라지는 글씨가 보인다. 열림 전환 시점에만 갈아끼운다.
  */
  function handleOpenChange(next: boolean) {
    if (next) {
      setForm(toForm(editing));
      setError(null);
    }
    onOpenChange(next);
  }

  function handleSave() {
    if (!form.title.trim()) {
      setError("경험 제목을 입력해주세요.");
      return;
    }
    startSave(async () => {
      try {
        setError(null);
        if (editing) {
          const updated = await updateExperienceBankItemAction(editing.id, form);
          if (updated) onSaved(updated, false);
        } else {
          const created = await createExperienceBankItemAction(form);
          onSaved(created, true);
        }
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "경험 수정하기" : "내 경험 추가하기"}</DialogTitle>
          <DialogDescription>
            여기에 정리해둔 경험은 자기소개서 문항마다 골라 쓸 수 있어요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-label-2 text-slate-500">
              이 경험을 뭐라고 부르면 좋을까요? (예: 고객 민원 해결)
            </Label>
            <Input
              className="mt-1"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          {FIELDS.map(({ key, label }) => (
            <div key={key}>
              <Label className="text-label-2 text-slate-500">{label}</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          {error && <p className="text-label-1 text-rose-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            {editing ? "수정 저장" : "경험 저장하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
