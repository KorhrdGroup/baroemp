"use client";

import { useState } from "react";
import { Briefcase, ChevronDown, GraduationCap, HeartHandshake, Landmark, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SupportProgramCard } from "./support-program-card";
import { SUPPORT_ELIGIBILITY_GRADE_LABELS } from "@/types";
import type { SupportEligibilityGrade, SupportProgram, MatchReasonDetail } from "@/types";

const COLLAPSE_COUNT = 4;

const FILTER_GRADES: SupportEligibilityGrade[] = ["HIGH", "MEDIUM", "CHECK_REQUIRED"];

const PILL_CLASS: Record<SupportEligibilityGrade, { base: string; active: string }> = {
  HIGH: { base: "border-emerald-200 text-emerald-700", active: "bg-emerald-50 border-emerald-300 text-emerald-700 ring-1 ring-emerald-200" },
  MEDIUM: { base: "border-brand-blue-200 text-brand-blue-700", active: "bg-brand-blue-50 border-brand-blue-300 text-brand-blue-700 ring-1 ring-brand-blue-200" },
  CHECK_REQUIRED: { base: "border-orange-200 text-orange-700", active: "bg-orange-50 border-orange-300 text-orange-700 ring-1 ring-orange-200" },
  LOW: { base: "border-slate-200 text-slate-500", active: "bg-slate-100 border-slate-300 text-slate-600 ring-1 ring-slate-200" },
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  employment: Briefcase,
  training: GraduationCap,
  living: HeartHandshake,
  regional: MapPin,
  other: Landmark,
};

export type ResultItem = {
  program: SupportProgram;
  // MatchResult(서비스 타입)의 grade가 optional이라 구조적으로 호환되도록 맞춘다.
  matchResult: { grade?: string; score: number; reasons: MatchReasonDetail[] };
};

export type ResultCategory = {
  category: string;
  label: string;
  items: ResultItem[];
};

function CollapsibleSection({
  category,
  label,
  items,
}: {
  category: string;
  label: string;
  items: ResultItem[];
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = CATEGORY_ICONS[category] ?? Landmark;
  const hasMore = items.length > COLLAPSE_COUNT;
  const visible = expanded ? items : items.slice(0, COLLAPSE_COUNT);

  return (
    <section>
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="size-4" />
        </span>
        <h2 className="text-body-1 font-bold text-slate-900">{label}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-label-2 font-semibold text-slate-500">
          {items.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {visible.map(({ program, matchResult }) => (
          <SupportProgramCard
            key={program.id}
            program={program}
            grade={(matchResult.grade ?? "CHECK_REQUIRED") as SupportEligibilityGrade}
            score={matchResult.score}
            reasons={matchResult.reasons}
          />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-white py-3 text-label-1 font-semibold text-slate-500 transition-colors hover:bg-slate-50"
        >
          {expanded ? "접기" : `${items.length - COLLAPSE_COUNT}개 더보기`}
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </section>
  );
}

export function SupportResultSections({
  categories,
  gradeCounts,
}: {
  categories: ResultCategory[];
  gradeCounts: Record<SupportEligibilityGrade, number>;
}) {
  const [activeGrade, setActiveGrade] = useState<SupportEligibilityGrade | null>(null);

  const filtered = activeGrade
    ? categories
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => item.matchResult.grade === activeGrade),
        }))
        .filter((group) => group.items.length > 0)
    : categories;

  return (
    <>
      <div className="mt-5 flex flex-wrap gap-2">
        {FILTER_GRADES.map((grade) => {
          const isActive = activeGrade === grade;
          const count = gradeCounts[grade];
          if (count === 0) return null;
          return (
            <button
              key={grade}
              type="button"
              onClick={() => setActiveGrade(isActive ? null : grade)}
              className={cn(
                "rounded-full border px-4 py-2 text-label-1 font-semibold transition-all",
                isActive ? PILL_CLASS[grade].active : PILL_CLASS[grade].base,
              )}
            >
              {SUPPORT_ELIGIBILITY_GRADE_LABELS[grade]} {count}개
            </button>
          );
        })}
      </div>

      <div className="mt-8 space-y-12">
        {filtered.map((group) => (
          <CollapsibleSection
            key={`${group.category}-${activeGrade ?? "all"}`}
            category={group.category}
            label={group.label}
            items={group.items}
          />
        ))}
      </div>
    </>
  );
}
