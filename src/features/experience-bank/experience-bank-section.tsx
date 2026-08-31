"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExperienceBankItem } from "@/types";
import { cn } from "@/lib/utils";
import { interactiveCardClass } from "@/lib/ui-classes";
import { DocumentMenu } from "@/components/common/document-menu";
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

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(item: ExperienceBankItem) {
    setEditing(item);
    setOpen(true);
  }

  async function handleDelete(item: ExperienceBankItem) {
    await deleteExperienceBankItemAction(item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
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
        {/*
          경험뱅크는 이력서·자기소개서를 쓰기 위한 재료라, 이 화면의 주 동작(새 이력서·
          새 자기소개서 만들기)과 같은 무게로 채워두면 셋이 서로 경쟁한다. 테두리 버튼으로 한 급 낮춘다.
        */}
        <Button
          variant="outline"
          size={nested ? "sm" : "default"}
          className="text-slate-600"
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
              className={cn(
                "relative flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-5",
                interactiveCardClass,
              )}
            >
              {/*
                이력서·자기소개서는 줄 전체가 편집으로 가는 링크다. 경험뱅크는 갈 곳이 페이지가
                아니라 창이라 링크를 쓸 수 없어, 줄을 덮는 버튼을 깔아 같은 감각으로 맞춘다.
                버튼 안에 버튼을 넣으면 안 되므로 겹쳐 두고, 글자는 클릭을 통과시킨다.
              */}
              <button
                type="button"
                aria-label={`${item.title} 수정하기`}
                onClick={() => openEdit(item)}
                className="absolute inset-0 cursor-pointer rounded-xl"
              />
              <div className="pointer-events-none relative min-w-0">
                <p className="truncate text-body-2 font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-label-1 text-slate-400">
                  {item.skills.length > 0 ? `${item.skills.slice(0, 3).join(" · ")} · ` : ""}
                  최근수정 {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
              {/* 이력서·자기소개서 목록과 같은 더보기 메뉴. 되돌릴 수 없는 삭제를 한 겹 안에 둔다. */}
              <div className="relative shrink-0">
                <DocumentMenu
                  label="경험"
                  title={item.title}
                  onEdit={() => openEdit(item)}
                  deleteNote="이 경험을 넣어 쓴 자기소개서 내용은 그대로 남습니다."
                  onDelete={() => handleDelete(item)}
                  /* 목록을 이 화면이 상태로 들고 있어 위에서 이미 지웠다. 새로고침할 것이 없다. */
                  afterDelete={() => {}}
                />
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

    </div>
  );
}
