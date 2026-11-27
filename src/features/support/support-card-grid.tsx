"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Briefcase, ChevronDown, ChevronUp, GraduationCap, HeartHandshake, Landmark, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SupportProgramCard } from "./support-program-card";
import { SUPPORT_ELIGIBILITY_GRADE_LABELS } from "@/types";
import type { SupportEligibilityGrade, SupportProgram, MatchReasonDetail } from "@/types";

/** 분야마다 처음 보이는 카드 수. 넓은 화면 3장 · 중간 2장 줄이 꽉 차게 2와 3의 배수로 둔다. */
const COLLAPSE_COUNT = 6;

const FILTER_GRADES: SupportEligibilityGrade[] = ["HIGH", "MEDIUM", "CHECK_REQUIRED"];

/* 등급 거르기 알약. 카드 배지와 같은 등급 색을 쓴다. 회색 띠 위라 안 고른 알약도 흰 바탕을 깐다. */
const PILL_CLASS: Record<SupportEligibilityGrade, { base: string; active: string }> = {
  HIGH: { base: "border-emerald-200 bg-white text-emerald-700", active: "bg-emerald-50 border-emerald-300 text-emerald-700 ring-1 ring-emerald-200" },
  MEDIUM: { base: "border-brand-blue-200 bg-white text-brand-blue-700", active: "bg-brand-blue-50 border-brand-blue-300 text-brand-blue-700 ring-1 ring-brand-blue-200" },
  CHECK_REQUIRED: { base: "border-orange-200 bg-white text-orange-700", active: "bg-orange-50 border-orange-300 text-orange-700 ring-1 ring-orange-200" },
  LOW: { base: "border-slate-200 bg-white text-slate-600", active: "bg-slate-100 border-slate-300 text-slate-600 ring-1 ring-slate-200" },
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
  bookmarkedSet,
}: {
  category: string;
  label: string;
  items: ResultItem[];
  bookmarkedSet: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const Icon = CATEGORY_ICONS[category] ?? Landmark;
  const hasMore = items.length > COLLAPSE_COUNT;
  const first = items.slice(0, COLLAPSE_COUNT);
  const rest = items.slice(COLLAPSE_COUNT);
  const renderCard = ({ program, matchResult }: ResultItem) => (
    <SupportProgramCard
      key={program.id}
      program={program}
      grade={(matchResult.grade ?? "CHECK_REQUIRED") as SupportEligibilityGrade}
      reasons={matchResult.reasons}
      isAuthenticated
      isBookmarked={bookmarkedSet.has(program.id)}
    />
  );

  const handleCollapse = () => {
    setExpanded(false);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section ref={sectionRef} className="scroll-mt-20">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-baro-blue">
          <Icon className="size-4" />
        </span>
        <h2 className="text-title-3 font-bold text-slate-900">{label}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-caption-1 font-semibold text-slate-600">
          {items.length}
        </span>
        {expanded && hasMore && (
          <button
            type="button"
            onClick={handleCollapse}
            className="ml-auto flex cursor-pointer items-center gap-1 rounded-xl px-3 py-1.5 text-body-3 font-semibold text-slate-700"
          >
            접기
            <ChevronUp className="size-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{first.map(renderCard)}</div>
      {/*
        더보기로 늘어나는 카드는 미리 그려 두고 높이를 0 → 제 높이로 부드럽게 연다(grid-rows 0fr → 1fr, 모든 브라우저에서 동작).
        닫혀 있을 때는 inert 로 초점 · 읽기에서 뺀다. 카드 호버 그림자가 잘리지 않게 사방 12px 여유를 두고 바깥 여백으로 되돌린다.
      */}
      {hasMore && (
        <div
          inert={!expanded}
          className={cn(
            "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="-mx-3 -mb-3 min-h-0 overflow-hidden px-3 pb-3">
            <div
              className={cn(
                "grid grid-cols-1 gap-4 pt-4 transition-opacity duration-500 motion-reduce:transition-none sm:grid-cols-2 lg:grid-cols-3",
                expanded ? "opacity-100" : "opacity-0",
              )}
            >
              {rest.map(renderCard)}
            </div>
          </div>
        </div>
      )}
      {hasMore && (
        <button
          type="button"
          onClick={() => (expanded ? handleCollapse() : setExpanded(true))}
          className="mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-white text-body-3 font-semibold text-slate-800"
        >
          {expanded ? "접기" : `${items.length - COLLAPSE_COUNT}개 더보기`}
          <ChevronDown className={cn("size-4 transition-transform duration-300 motion-reduce:transition-none", expanded && "rotate-180")} />
        </button>
      )}
    </section>
  );
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 flex size-12 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700"
      aria-label="맨 위로"
    >
      <ArrowUp className="size-5" />
    </button>
  );
}

export function SupportResultSections({
  categories,
  gradeCounts,
  bookmarkedIds = [],
}: {
  categories: ResultCategory[];
  gradeCounts: Record<SupportEligibilityGrade, number>;
  /** 로그인 회원이 이미 찜해둔 지원제도. 카드의 찜 버튼 초기 상태로 쓴다. */
  bookmarkedIds?: string[];
}) {
  const [activeGrade, setActiveGrade] = useState<SupportEligibilityGrade | null>(null);
  const bookmarkedSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);

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
              aria-pressed={isActive}
              className={cn(
                "h-11 rounded-full border px-5 text-body-2 font-semibold transition-colors duration-300",
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
            bookmarkedSet={bookmarkedSet}
          />
        ))}
      </div>

      <ScrollToTopButton />
    </>
  );
}
