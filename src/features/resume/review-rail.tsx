"use client";

import { useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIReviewAutoFix } from "@/types";

/**
 * AI 점검 결과 플로팅 패널.
 * 데스크톱: 오른쪽에 떠 있는 팝업(fixed). 모바일: 하단 시트.
 * 항목을 누르면 편집 폼의 해당 섹션으로 스크롤해 바로 고치게 한다.
 */
export interface RailItem {
  id: string;
  /** 편집 폼 섹션 앵커 키 (resume-section-*) */
  sectionKey: string;
  title: string;
  /** 선택된 항목에서 보여주는 자세한 설명 (AI comment) */
  hint: string;
  gain: number;
  severity: "required" | "recommended";
  done: boolean;
  /** AI가 완성 문장까지 준 항목. 있으면 '적용하기' 한 번으로 칸에 들어간다. */
  fix?: AIReviewAutoFix;
}

export function useRailSummary(items: RailItem[], score: number) {
  return useMemo(() => {
    const remaining = items.filter((i) => !i.done);
    const gainLeft = remaining.reduce((sum, i) => sum + i.gain, 0);
    return {
      doneCount: items.length - remaining.length,
      total: items.length,
      requiredLeft: remaining.filter((i) => i.severity === "required").length,
      projected: Math.min(100, score + gainLeft),
      pct: Math.min(100, Math.round(score)),
      projectedPct: Math.min(100, score + gainLeft),
    };
  }, [items, score]);
}

function ScoreBar({ pct, projectedPct }: { pct: number; projectedPct: number }) {
  return (
    <div className="relative h-2 overflow-hidden rounded-full bg-slate-200">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-blue-600 to-brand-blue-400"
        style={{ width: `${pct}%` }}
      />
      {/* 남은 항목을 채우면 오르는 구간 - 사선 패턴 */}
      <div
        className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,#C9D5F5_0_4px,transparent_4px_8px)]"
        style={{ left: `${pct}%`, width: `${Math.max(0, projectedPct - pct)}%` }}
      />
    </div>
  );
}

function RailItemRow({
  item,
  index,
  active,
  onSelect,
  onToggleDone,
  onApplyFix,
}: {
  item: RailItem;
  index: number;
  active: boolean;
  onSelect: () => void;
  onToggleDone: () => void;
  onApplyFix: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-[10px] border transition-colors",
        active ? "border-brand-blue-200 bg-brand-blue-50/70" : "border-transparent hover:bg-slate-50",
      )}
    >
      <button type="button" onClick={onSelect} className="flex w-full items-start gap-2.5 px-2.5 py-3 text-left">
        <span
          className={cn(
            "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[5px] text-[10.5px] font-extrabold",
            item.done ? "bg-emerald-600 text-white" : active ? "bg-brand-blue-600 text-white" : "bg-slate-100 text-slate-500",
          )}
        >
          {item.done ? "✓" : index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-label-1 font-bold break-keep",
              item.done ? "text-slate-400 line-through" : active ? "text-brand-blue-700" : "text-slate-700",
            )}
          >
            {item.title}
          </span>
        </span>
        {!item.done && item.severity === "required" && (
          <span className="inline-flex h-[18px] shrink-0 items-center rounded bg-rose-50 px-1.5 text-[9.5px] font-extrabold text-rose-600">
            필수
          </span>
        )}
        <span
          className={cn(
            "shrink-0 text-[11.5px] font-extrabold",
            item.done ? "text-emerald-600" : item.severity === "required" ? "text-orange-600" : "text-violet-500",
          )}
        >
          {item.done ? "완료" : `+${item.gain}`}
        </span>
      </button>
      {active && !item.done && (
        <div className="px-2.5 pb-3 pl-[38px]">
          <p className="text-label-1 leading-relaxed break-keep text-slate-600">{item.hint}</p>
          {item.fix ? (
            /*
              AI가 완성 문장까지 준 항목. 문장을 미리 보여주고 '적용하기'로 칸에 넣는다.
              적용 후에도 칸에서 자유롭게 고칠 수 있으니 여기서는 확인만 시킨다.
            */
            <div className="mt-2 rounded-lg border border-brand-blue-100 bg-white p-2.5">
              <p className="flex items-center gap-1 text-label-2 font-bold text-brand-blue-600">
                <Sparkles className="size-3.5" /> AI가 이렇게 고쳐드릴게요
              </p>
              <p className="mt-1 line-clamp-4 text-label-1 leading-relaxed break-keep text-slate-700">{item.fix.text}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onApplyFix}
                  className="h-8 rounded-lg bg-brand-blue-600 px-3 text-label-1 font-semibold text-white hover:bg-brand-blue-700"
                >
                  적용하기
                </button>
                <button
                  type="button"
                  onClick={onToggleDone}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-label-1 font-semibold text-slate-500 hover:bg-slate-50"
                >
                  직접 고쳤어요
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggleDone}
              className="mt-2 h-8 rounded-lg border border-emerald-200 bg-white px-3 text-label-1 font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              고쳤어요 ✓
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ReviewRail({
  score,
  items,
  activeItemId,
  strengths,
  onSelectItem,
  onToggleDone,
  onApplyFix,
  onNext,
  onRecheck,
  onClose,
  rechecking,
}: {
  score: number;
  items: RailItem[];
  activeItemId: string | null;
  strengths: string[];
  onSelectItem: (id: string) => void;
  onToggleDone: (id: string) => void;
  onApplyFix: (id: string) => void;
  onNext: () => void;
  onRecheck: () => void;
  onClose: () => void;
  rechecking?: boolean;
}) {
  const [strengthsOpen, setStrengthsOpen] = useState(false);
  const s = useRailSummary(items, score);

  return (
    /*
      데스크톱: 오른쪽에 떠 있는 팝업. 모바일: 하단 시트.
      편집 폼을 가리지 않도록 폭을 340px로 제한하고, 목록이 길면 패널 안에서 스크롤한다.
    */
    <aside
      className={cn(
        "fixed z-40 flex flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-slate-200",
        "inset-x-0 bottom-0 max-h-[62vh] rounded-t-2xl",
        "lg:inset-x-auto lg:right-5 lg:top-24 lg:bottom-auto lg:max-h-[calc(100vh-8.5rem)] lg:w-[340px] lg:rounded-2xl",
      )}
      aria-label="AI 점검 결과"
    >
      <header className="shrink-0 border-b border-slate-100 px-[18px] pt-4 pb-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex h-[22px] items-center rounded-md bg-brand-blue-50 px-2.5 text-label-2 font-extrabold text-brand-blue-600">
            AI 점검 결과
          </span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-baseline gap-[3px]">
              <span className="text-[26px] leading-none font-extrabold tracking-tight text-slate-900">{score}</span>
              <span className="text-[11px] font-semibold text-slate-400">/ 100점</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="점검 결과 닫기"
              className="flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <ScoreBar pct={s.pct} projectedPct={s.projectedPct} />

        <div className="mt-2 flex justify-between text-label-2">
          <span className="text-slate-500">
            {s.total}개 중 <b className="text-slate-900">{s.doneCount}개</b> 완료
          </span>
          <span className="font-bold text-emerald-700">다 고치면 약 {s.projected}점</span>
        </div>

        {s.requiredLeft > 0 ? (
          <p className="mt-2 text-label-1 leading-relaxed break-keep text-slate-500">
            <b className="text-rose-600">필수 {s.requiredLeft}개</b>부터 채우면 점수가 가장 크게 오릅니다.
          </p>
        ) : s.total > 0 ? (
          <p className="mt-2 text-label-1 font-semibold break-keep text-emerald-700">
            필수 항목을 모두 채웠습니다. 권장 항목까지 채우면 더 좋아져요.
          </p>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-2">
        {items.length > 0 && (
          <div className="flex items-center gap-1.5 px-1 pb-2">
            <span className="flex size-[17px] items-center justify-center rounded-[5px] bg-orange-500 text-[10px] font-extrabold text-white">
              !
            </span>
            <span className="text-label-1 font-bold text-slate-900">누르면 바로 고칠 수 있어요</span>
            <span className="ml-auto text-[11px] text-slate-400">점수 영향 순</span>
          </div>
        )}

        <ol className="flex flex-col gap-[3px]">
          {items.map((item, i) => (
            <li key={item.id}>
              <RailItemRow
                item={item}
                index={i}
                active={item.id === activeItemId}
                onSelect={() => onSelectItem(item.id)}
                onToggleDone={() => onToggleDone(item.id)}
                onApplyFix={() => onApplyFix(item.id)}
              />
            </li>
          ))}
        </ol>

        {strengths.length > 0 && (
          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 pt-3 pb-3">
            <button
              type="button"
              onClick={() => setStrengthsOpen((v) => !v)}
              className="flex w-full items-center gap-1.5"
              aria-expanded={strengthsOpen}
            >
              <span className="flex size-[17px] items-center justify-center rounded-full bg-emerald-600 text-[10px] font-extrabold text-white">
                ✓
              </span>
              <span className="text-label-1 font-bold text-emerald-800">잘하신 부분 {strengths.length}가지</span>
              <span className="ml-auto text-[11px] text-emerald-700">{strengthsOpen ? "접기 ▴" : "펼치기 ▾"}</span>
            </button>
            {strengthsOpen && (
              <ul className="mt-2.5 flex flex-col gap-2 pl-1">
                {strengths.map((text) => (
                  <li key={text} className="text-label-1 leading-relaxed break-keep text-emerald-900/80">
                    {text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <footer className="flex shrink-0 gap-2 border-t border-slate-100 px-3.5 pt-2.5 pb-3.5">
        <button
          type="button"
          onClick={onNext}
          className="h-10 flex-1 rounded-[9px] bg-brand-blue-600 text-label-1 font-bold text-white transition-colors hover:bg-brand-blue-700"
        >
          다음 항목으로 이동
        </button>
        <button
          type="button"
          onClick={onRecheck}
          disabled={rechecking}
          className="h-10 rounded-[9px] border border-slate-200 bg-white px-3 text-label-1 font-semibold text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700 disabled:opacity-50"
        >
          {rechecking ? "점검 중…" : "다시 점검"}
        </button>
      </footer>
    </aside>
  );
}
