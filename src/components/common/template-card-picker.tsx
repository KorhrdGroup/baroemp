"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TemplateOption {
  id: string;
  name: string;
  description?: string;
  /** 카드 하단 부가 정보 (예: "문항 5개") */
  hint?: string;
}

/**
 * 편집 화면 상단의 양식 선택 카드.
 * 양식 선택을 별도 Step으로 두지 않는 대신, 여기서 이름과 설명을 함께 보여줘
 * 어떤 양식인지 알고 바꿀 수 있게 한다(드롭다운만으로는 차이를 알 수 없다).
 * 기본은 접힌 상태로 현재 양식만 보여주고, 바꿀 때만 펼친다.
 */
export function TemplateCardPicker({
  label,
  templates,
  value,
  onChange,
  pending,
  gridClassName = "sm:grid-cols-2",
  defaultOpen = false,
}: {
  label: string;
  templates: TemplateOption[];
  value?: string;
  onChange: (templateId: string) => void;
  pending?: boolean;
  gridClassName?: string;
  /** 처음 만든 직후처럼 아직 양식을 고르지 않은 상태에서는 펼친 채로 시작한다. */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (templates.length === 0) return null;

  const current = templates.find((t) => t.id === value) ?? templates[0];

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-border">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label-2 text-slate-400">{label}</p>
          <p className="mt-0.5 text-body-2 font-bold text-slate-900">{current.name}</p>
          {current.description && (
            <p className="mt-1 text-label-1 text-slate-500">{current.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={pending}
          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-border px-3 py-2 text-label-1 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          aria-expanded={open}
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {open ? "접기" : "양식 변경"}
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>

      {open && (
        <div className={cn("mt-4 grid grid-cols-1 gap-3", gridClassName)}>
          {templates.map((template) => {
            const selected = template.id === current.id;
            return (
              <button
                key={template.id}
                type="button"
                disabled={pending}
                onClick={() => {
                  onChange(template.id);
                  setOpen(false);
                }}
                className={cn(
                  "relative flex cursor-pointer flex-col rounded-xl border-2 p-4 text-left transition-colors disabled:opacity-60",
                  selected
                    ? "border-brand-blue-400 bg-brand-blue-50/50"
                    : "border-border bg-white hover:border-brand-blue-200",
                )}
              >
                {selected && (
                  <CheckCircle2 className="absolute right-3 top-3 size-5 text-brand-blue-600" />
                )}
                <p className="pr-6 text-label-1 font-bold text-slate-900">{template.name}</p>
                {template.description && (
                  <p className="mt-1.5 text-label-2 leading-relaxed text-slate-500">{template.description}</p>
                )}
                {template.hint && <p className="mt-2 text-label-2 text-slate-400">{template.hint}</p>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
