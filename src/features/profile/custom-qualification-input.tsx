"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** 자격 이름 하나의 길이·개수 상한. 자유 입력이라 서버도 같은 값으로 자른다 (answer-normalizer). */
export const CUSTOM_QUALIFICATION_MAX_LENGTH = 40;
export const CUSTOM_QUALIFICATION_MAX_COUNT = 10;

export function normalizeCustomQualification(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, CUSTOM_QUALIFICATION_MAX_LENGTH);
}

/**
 * 목록에 없는 자격을 직접 적는 칸. 프로필 수정·온보딩·직업진단이 같이 쓴다.
 * 적은 자격은 칩으로 쌓이고 X 로 뺀다. 목록에 있는 이름을 적으면 중복으로 치고 받지 않는다.
 */
export function CustomQualificationInput({
  values,
  onChange,
  reserved = [],
  className,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  /** 이미 선택지로 있는 이름. 여기 있는 걸 적으면 안내만 하고 안 받는다. */
  reserved?: string[];
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const add = () => {
    const name = normalizeCustomQualification(draft);
    if (!name) return;
    if (reserved.includes(name)) {
      setNotice("위 목록에 있는 자격이에요. 목록에서 골라 주세요.");
      return;
    }
    if (values.includes(name)) {
      setNotice("이미 적은 자격이에요.");
      return;
    }
    if (values.length >= CUSTOM_QUALIFICATION_MAX_COUNT) {
      setNotice(`직접 적는 자격은 ${CUSTOM_QUALIFICATION_MAX_COUNT}개까지예요.`);
      return;
    }
    onChange([...values, name]);
    setDraft("");
    setNotice(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full border border-brand-blue-400 bg-brand-blue-50 py-1 pl-3.5 pr-1.5 text-label-1 font-medium text-brand-blue-700"
            >
              {name}
              <button
                type="button"
                aria-label={`${name} 빼기`}
                onClick={() => onChange(values.filter((v) => v !== name))}
                className="rounded-full p-0.5 text-brand-blue-500 hover:bg-brand-blue-100 hover:text-brand-blue-700"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (notice) setNotice(null);
          }}
          onKeyDown={(e) => {
            // 엔터로 추가한다. 폼 안에서는 엔터가 제출로 이어지지 않게 막는다.
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          maxLength={CUSTOM_QUALIFICATION_MAX_LENGTH}
          placeholder="목록에 없는 자격증을 직접 적어 주세요"
          aria-label="자격증 직접 입력"
          className="h-12 flex-1"
        />
        <Button type="button" variant="outline" className="h-12 shrink-0" onClick={add} disabled={!draft.trim()}>
          <Plus className="size-4" />
          추가
        </Button>
      </div>
      {notice && (
        <p className="text-label-2 text-amber-700" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
