"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ResumeTemplate } from "@/types";
import { createResumeAction } from "./resume-actions";

/**
 * /resume/new: Template 선택 (Step 1) → 생성과 동시에 Career DB prefill (Step 2는 편집화면에서 검토/수정).
 * 스펙 19번의 두 Step을 하나의 클릭으로 이어붙여, 중장년 사용자가 추가 화면전환 없이
 * 바로 prefill된 내용을 편집화면에서 검토/수정하도록 설계했다.
 */
export function ResumeTemplatePicker({
  templates,
  targetJobId,
  targetOccupationId,
  suggestedTitle,
}: {
  templates: ResumeTemplate[];
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
        const detail = await createResumeAction({
          templateId: selected,
          title: suggestedTitle,
          targetJobId,
          targetOccupationId,
        });
        router.push(`/resume/${detail.resume.id}/edit`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "이력서 생성에 실패했습니다.");
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
              selected === template.id ? "border-brand-blue-400 bg-brand-blue-50/50" : "border-border bg-white hover:border-brand-blue-200",
            )}
          >
            {selected === template.id && (
              <CheckCircle2 className="absolute right-4 top-4 size-5 text-brand-blue-600" />
            )}
            <p className="text-body-2 font-bold text-slate-900">{template.name}</p>
            <p className="mt-2 text-label-1 text-slate-500">{template.description}</p>
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-label-1 text-rose-500">{error}</p>}

      <div className="mt-8 flex justify-end">
        <Button size="lg" onClick={handleCreate} disabled={!selected || isCreating} className="min-w-[200px]">
          {isCreating && <Loader2 className="size-4 animate-spin" />}
          이 양식으로 이력서 만들기
        </Button>
      </div>
    </div>
  );
}
