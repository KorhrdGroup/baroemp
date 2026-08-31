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
  action,
}: {
  label: string;
  icon?: React.ReactNode;
  options: PillOption[];
  value?: string;
  onChange: (id: string) => void;
  pending?: boolean;
  /** 카드 오른쪽 끝에 함께 놓을 버튼. 고른 값에 딸린 행동을 같은 상자 안에 둔다. */
  action?: React.ReactNode;
}) {
  if (options.length === 0) return null;

  const current = options.find((o) => o.id === value) ?? options[0];

  return (
    /*
      바탕은 아래 카드들과 같은 흰색으로 둔다. 연한 파랑도 대봤는데,
      페이지 바탕이 회색이라 회색-파랑-흰색 세 면이 겹쳐 오히려 어수선했다.
      설정과 문서는 색이 아니라 순서(맨 위)와 제목으로 갈린다.

      세 층으로 쌓는다: 무엇을 고르는지(제목 + 딸린 버튼) -> 선택지 -> 고른 것의 설명.
      한 줄에 제목과 알약을 섞으면 어디까지가 제목인지 흐리고,
      설명만 아래 왼쪽에 남아 버튼과 따로 놀았다.
    */
    <div className="rounded-xl bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex shrink-0 items-center gap-1.5 text-label-1 font-semibold text-slate-500">
          {icon}
          {label}
        </span>
        {action}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
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
                  ? "border-transparent bg-brand-blue-600 font-semibold text-white"
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
        <p className="mt-2 text-label-2 text-slate-400">{current.description}</p>
      )}
    </div>
  );
}
