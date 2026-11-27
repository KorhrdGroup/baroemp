"use client";

import { useEffect, useState } from "react";
import type { MatchReasonDetail, SupportEligibilityGrade, SupportProgram } from "@/types";
import { SupportProgramCard } from "./support-program-card";
import { SUPPORT_BOOKMARK_SYNC_EVENT } from "./support-bookmark-button";

export type BookmarkedSupportItem = {
  program: SupportProgram;
  grade?: SupportEligibilityGrade;
  reasons?: MatchReasonDetail[];
};

/**
 * 지원금 찾기 결과 맨 위 "찜한 지원금" 묶음.
 * 아래 결과 카드에서 찜하면 새로 고치지 않아도 바로 맨 앞에 붙고, 찜을 풀면 바로 빠진다(찜 단추가 보내는 알림을 듣는다).
 * 새로 붙일 카드는 이번 결과(pool)에서 찾는다.
 */
export function SupportBookmarkedSection({ initial, pool }: { initial: BookmarkedSupportItem[]; pool: BookmarkedSupportItem[] }) {
  const [items, setItems] = useState(initial);

  useEffect(() => {
    const byId = new Map(pool.map((it) => [it.program.id, it]));
    const onSync = (e: Event) => {
      const { supportProgramId, bookmarked } = (e as CustomEvent<{ supportProgramId: string; bookmarked: boolean }>).detail;
      setItems((prev) => {
        const has = prev.some((it) => it.program.id === supportProgramId);
        if (bookmarked && !has) {
          const found = byId.get(supportProgramId);
          return found ? [found, ...prev] : prev;
        }
        if (!bookmarked && has) return prev.filter((it) => it.program.id !== supportProgramId);
        return prev;
      });
    };
    window.addEventListener(SUPPORT_BOOKMARK_SYNC_EVENT, onSync);
    return () => window.removeEventListener(SUPPORT_BOOKMARK_SYNC_EVENT, onSync);
  }, [pool]);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="support-bookmarks" className="mt-5 border-b border-slate-200 pb-10">
      <div className="mb-5 flex items-center gap-2.5">
        <h2 id="support-bookmarks" className="text-title-3 font-bold text-slate-900">
          찜한 지원금
        </h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-caption-1 font-semibold text-slate-600">{items.length}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ program, grade, reasons }) => (
          <SupportProgramCard key={program.id} program={program} grade={grade} reasons={reasons} isAuthenticated isBookmarked />
        ))}
      </div>
    </section>
  );
}
