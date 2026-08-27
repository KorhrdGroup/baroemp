"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  createExperienceBankItemAction,
  deleteExperienceBankItemAction,
  updateExperienceBankItemAction,
} from "./experience-bank-actions";

const EMPTY_FORM = { title: "", situation: "", task: "", action: "", result: "" };
type FormState = typeof EMPTY_FORM;

/** STAR 용어를 노출하지 않고 쉬운 질문으로 입력받는다 (스펙 35번). */
const FIELDS: { key: keyof Omit<FormState, "title">; label: string }[] = [
  { key: "situation", label: "어떤 상황이었나요?" },
  { key: "task", label: "어떤 역할/과제를 맡았나요?" },
  { key: "action", label: "무엇을 했나요?" },
  { key: "result", label: "결과는 어땠나요? (숫자가 없어도 괜찮아요)" },
];

function toForm(item: ExperienceBankItem): FormState {
  return {
    title: item.title,
    situation: item.situation ?? "",
    task: item.task ?? "",
    action: item.action ?? "",
    result: item.result ?? "",
  };
}

/**
 * 이력서 화면의 경험뱅크 섹션.
 * 추가/수정은 모달에서 처리하고 삭제도 목록에서 바로 할 수 있게 해,
 * 경험 하나 고치려고 /experience-bank로 한 뎁스 더 들어가지 않아도 되게 한다.
 */
export function ExperienceBankSection({
  initialItems,
  nested = false,
}: {
  initialItems: ExperienceBankItem[];
  /** 자기소개서 섹션 안에 재료로 들여 넣을 때. 제목을 낮추고 묶음 배경을 깐다. */
  nested?: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [open, setOpen] = useState(false);
  /** null이면 새로 추가, 값이 있으면 그 항목 수정 */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(item: ExperienceBankItem) {
    setEditingId(item.id);
    setForm(toForm(item));
    setError(null);
    setOpen(true);
  }

  function handleSave() {
    if (!form.title.trim()) {
      setError("경험 제목을 입력해주세요.");
      return;
    }
    startSave(async () => {
      try {
        setError(null);
        if (editingId) {
          const updated = await updateExperienceBankItemAction(editingId, form);
          if (updated) setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        } else {
          const created = await createExperienceBankItemAction(form);
          setItems((prev) => [created, ...prev]);
        }
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      }
    });
  }

  async function handleDelete(item: ExperienceBankItem) {
    if (!window.confirm(`'${item.title}' 경험을 삭제할까요?`)) return;
    setDeletingId(item.id);
    try {
      await deleteExperienceBankItemAction(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    // 자기소개서 편집기/마이페이지에서 #experience-bank로 바로 넘어온다.
    // sticky 헤더에 제목이 가리지 않도록 scroll-mt를 준다.
    <div
      id="experience-bank"
      className={cn("scroll-mt-24", nested ? "mt-4 rounded-xl bg-slate-50 p-5" : "mt-10")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className={cn("font-bold text-slate-900", nested ? "text-label-1" : "text-body-1")}>
            내 경험뱅크 ({items.length})
          </h2>
          {nested && (
            <p className="mt-0.5 text-label-2 text-slate-500">
              여기 저장해둔 경험은 자기소개서 문항을 쓸 때 그대로 불러와 쓸 수 있어요.
            </p>
          )}
        </div>
        <Button
          size={nested ? "sm" : "default"}
          className="bg-brand-blue-400 hover:bg-brand-blue-600"
          onClick={openCreate}
        >
          <Plus className="size-4" /> 내 경험 추가하기
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-white p-8 text-center">
          <p className="text-label-1 text-slate-500">
            아직 저장한 경험이 없어요. 미리 정리해두면 자기소개서 문항마다 골라 쓸 수 있어요.
          </p>
          {/* 다른 섹션의 빈 상태 CTA와 같은 텍스트 링크 형태. 이동이 아니라 모달을 열어야 해서 button이다. */}
          <button
            type="button"
            onClick={openCreate}
            className="mt-3 inline-block cursor-pointer text-label-1 font-semibold text-brand-blue-600 hover:underline"
          >
            경험 추가하기 →
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-5"
            >
              <div className="min-w-0">
                <p className="truncate text-body-2 font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-label-1 text-slate-400">
                  {item.skills.length > 0 ? `${item.skills.slice(0, 3).join(" · ")} · ` : ""}
                  최근수정 {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="icon" aria-label={`${item.title} 수정`} onClick={() => openEdit(item)}>
                  <Pencil className="size-4 text-slate-400" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${item.title} 삭제`}
                  disabled={deletingId === item.id}
                  onClick={() => void handleDelete(item)}
                >
                  {deletingId === item.id ? (
                    <Loader2 className="size-4 animate-spin text-slate-400" />
                  ) : (
                    <Trash2 className="size-4 text-slate-400" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "경험 수정하기" : "내 경험 추가하기"}</DialogTitle>
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
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {editingId ? "수정 저장" : "경험 저장하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
