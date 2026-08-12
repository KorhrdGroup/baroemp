"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { runCareerGapAnalysisAction } from "./career-gap-actions";
import type { EmploymentDestination, Occupation } from "@/types";

interface SuggestedTarget {
  occupationId: string;
  occupationName: string;
  source: string;
}

interface CareerGapTargetPickerProps {
  occupations: Occupation[];
  destinationsByOccupationId: Record<string, EmploymentDestination[]>;
  suggested: SuggestedTarget[];
  presetOccupationId?: string;
  presetDestinationId?: string;
  presetJobId?: string;
}

export function CareerGapTargetPicker({
  occupations,
  destinationsByOccupationId,
  suggested,
  presetOccupationId,
  presetDestinationId,
  presetJobId,
}: CareerGapTargetPickerProps) {
  const router = useRouter();
  const [occupationId, setOccupationId] = useState<string>(presetOccupationId ?? "");
  const [destinationId, setDestinationId] = useState<string>(presetDestinationId ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const destinations = useMemo(() => destinationsByOccupationId[occupationId] ?? [], [destinationsByOccupationId, occupationId]);
  const selectedOccupation = occupations.find((o) => o.id === occupationId);

  function selectOccupation(id: string) {
    setOccupationId(id);
    if (!(destinationsByOccupationId[id] ?? []).some((d) => d.id === destinationId)) {
      setDestinationId("");
    }
  }

  function handleSubmit() {
    if (!occupationId) {
      setError("먼저 준비하실 직업을 선택해주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const { analysisId } = await runCareerGapAnalysisAction({
          occupationId,
          employmentDestinationId: destinationId || undefined,
          targetJobId: presetJobId || undefined,
        });
        router.push(`/career-gap/${analysisId}`);
      } catch {
        setError("분석 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {suggested.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="flex items-center gap-1.5 text-[14px] font-semibold text-slate-700">
            <Sparkles className="size-4 text-brand-blue-500" /> 추천 직업
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggested.map((s) => (
              <button
                key={s.occupationId}
                type="button"
                onClick={() => selectOccupation(s.occupationId)}
                className={cn(
                  "rounded-full border px-4 py-2 text-[14px] font-medium transition-colors",
                  occupationId === s.occupationId
                    ? "border-brand-blue-500 bg-brand-blue-500 text-white"
                    : "border-border bg-white text-slate-600 hover:border-brand-blue-300",
                )}
              >
                {s.occupationName}
                <span className={cn("ml-1.5 text-[11px]", occupationId === s.occupationId ? "text-white/80" : "text-slate-400")}>
                  {s.source}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white p-5">
        <p className="text-[14px] font-semibold text-slate-700">직접 선택</p>
        <div className="mt-3">
          <Select value={occupationId} onValueChange={selectOccupation}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="준비하실 직업을 선택해주세요" />
            </SelectTrigger>
            <SelectContent>
              {occupations.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {occupationId && destinations.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[13px] font-medium text-slate-500">
              어떤 취업처를 생각하고 계세요? (선택하지 않으면 {selectedOccupation?.name} 전체로 분석해요)
            </p>
            <Select value={destinationId} onValueChange={setDestinationId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="취업처 선택 (선택 안 해도 괜찮아요)" />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {error && <p className="text-[13px] text-rose-600">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={isPending || !occupationId}
        className="h-12 w-full rounded-xl bg-brand-blue-500 text-[15px] font-semibold hover:bg-brand-blue-600"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> 실제 채용공고를 분석하고 있어요...
          </>
        ) : (
          "지금 준비도 확인하기"
        )}
      </Button>
    </div>
  );
}
