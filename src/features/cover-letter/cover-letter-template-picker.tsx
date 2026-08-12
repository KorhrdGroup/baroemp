"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CoverLetterTemplate } from "@/types";
import { createCoverLetterAction } from "./cover-letter-actions";

export function CoverLetterTemplatePicker({
  templates,
  resumeId,
  targetJobId,
  targetOccupationId,
  suggestedTitle,
}: {
  templates: CoverLetterTemplate[];
  resumeId?: string;
  targetJobId?: string;
  targetOccupationId?: string;
  suggestedTitle?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(templates[0]?.id ?? null);
  const [isCreating, startCreate] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    if (!selected) return;
    startCreate(async () => {
      try {
        setError(null);
        const detail = await createCoverLetterAction({
          templateId: selected,
          title: suggestedTitle,
          resumeId,
          targetJobId,
          targetOccupationId,
        });
        router.push(`/cover-letter/${detail.coverLetter.id}/edit`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "자기소개서 생성에 실패했습니다.");
      }
    });
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => setSelected(template.id)}
            className={cn(
              "relative flex flex-col rounded-2xl border-2 p-5 text-left transition-colors",
              selected === template.id ? "border-brand-blue-500 bg-brand-blue-50/50" : "border-border bg-white hover:border-brand-blue-200",
            )}
          >
            {selected === template.id && <CheckCircle2 className="absolute right-4 top-4 size-5 text-brand-blue-500" />}
            <p className="text-base font-bold text-slate-900">{template.name}</p>
            <p className="mt-2 text-[13px] leading-6 text-slate-500">{template.description}</p>
            <p className="mt-3 text-[12px] text-slate-400">문항 {template.defaultQuestions.length}개</p>
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-rose-500">{error}</p>}

      <div className="mt-8 flex justify-end">
        <Button size="lg" onClick={handleCreate} disabled={!selected || isCreating} className="min-w-[200px]">
          {isCreating && <Loader2 className="size-4 animate-spin" />}
          이 양식으로 자기소개서 작성
        </Button>
      </div>
    </div>
  );
}
