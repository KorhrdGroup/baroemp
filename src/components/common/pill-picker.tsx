"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PillOption {
  id: string;
  name: string;
  /** 선택했을 때 아래 한 줄로 보여줄 설명 */
  description?: string;
}

/**
 * 이력서 AI 에이전트 / 자기소개서 양식처럼 "이 문서의 기준"을 고르는 공용 선택기.
 * 항상 펼쳐진 pill 한 줄로 두어 편집 폼을 밀어내지 않고, 선택된 항목의 설명만 아래에 붙인다.
 */
export function PillPicker({
  label,
  icon,
  options,
  value,
  onChange,
  pending,
}: {
  label: string;
  icon?: React.ReactNode;
  options: PillOption[];
  value?: string;
  onChange: (id: string) => void;
  pending?: boolean;
}) {
  if (options.length === 0) return null;

  const current = options.find((o) => o.id === value) ?? options[0];

  return (
    <div className="rounded-xl bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 flex shrink-0 items-center gap-1.5 text-label-1 font-semibold text-slate-500">
          {icon}
          {label}
        </span>
        {options.map((option) => {
          const selected = option.id === current.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={pending}
              onClick={() => onChange(option.id)}
              aria-pressed={selected}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-label-1 font-medium transition-colors disabled:opacity-50",
                selected
                  ? "border-transparent bg-brand-blue-600 text-white"
                  : "border-border bg-white text-slate-600 hover:border-brand-blue-200 hover:text-brand-blue-700",
              )}
            >
              {option.name}
            </button>
          );
        })}
        {pending && <Loader2 className="size-4 animate-spin text-slate-400" />}
      </div>
      {current.description && (
        <p className="mt-1.5 text-label-2 text-slate-400">{current.description}</p>
      )}
    </div>
  );
}
