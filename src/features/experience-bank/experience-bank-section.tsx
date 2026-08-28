"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExperienceBankItem } from "@/types";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ExperienceFormDialog } from "./experience-form-dialog";
import { deleteExperienceBankItemAction } from "./experience-bank-actions";

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
  const [editing, setEditing] = useState<ExperienceBankItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // 확인 창은 지울 항목을 들고 있는다. 이름을 물어보는 말에 그대로 쓴다.
  const [confirmingDelete, setConfirmingDelete] = useState<ExperienceBankItem | null>(null);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(item: ExperienceBankItem) {
    setEditing(item);
    setOpen(true);
  }

  async function handleDelete(item: ExperienceBankItem) {
    setConfirmingDelete(null);
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
                  onClick={() => setConfirmingDelete(item)}
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

      <ExperienceFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={(item, isNew) =>
          setItems((prev) => (isNew ? [item, ...prev] : prev.map((i) => (i.id === item.id ? item : i))))
        }
      />

      <ConfirmDialog
        open={confirmingDelete !== null}
        onOpenChange={(next) => !next && setConfirmingDelete(null)}
        title={confirmingDelete ? `'${confirmingDelete.title}' 경험을 삭제할까요?` : ""}
        description="삭제하면 되돌릴 수 없습니다. 이 경험을 넣어 쓴 자기소개서 내용은 그대로 남습니다."
        pending={deletingId !== null}
        onConfirm={() => confirmingDelete && void handleDelete(confirmingDelete)}
      />
    </div>
  );
}
