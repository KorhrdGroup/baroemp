"use client";

import { useEffect, useRef, useState } from "react";
import type { JobCurationResult, JobCurationTab } from "@/types";
import { cn } from "@/lib/utils";
import { filterPillClass, filterPillOffClass, filterPillOnClass } from "@/lib/ui-classes";
import { JobCard } from "./job-card";
import {
  getJobCurationAction,
  trackCurationJobClickedAction,
  trackCurationTabViewedAction,
} from "./job-actions";

const TABS: { key: JobCurationTab; label: string }[] = [
  { key: "new", label: "신규 공고" },
  { key: "closing_soon", label: "마감임박" },
  { key: "matched", label: "맞춤 추천" },
  { key: "ready_to_apply", label: "지금 지원가능" },
  { key: "unlockable", label: "자격 따면 열리는 공고" },
];

const EMPTY_MESSAGES: Record<string, string> = {
  EMPTY: "조건에 맞는 공고가 아직 없어요.",
  NEEDS_PROFILE: "희망직무를 설정하면 맞춤 공고를 보여드려요.",
};

/** 마감임박 탭 전용: JobCard는 "마감임박"/"~날짜" 문구만 보여주고 D-day 캡션은 없으므로 여기서 계산해 덧붙인다. */
function formatDday(applyDeadline?: string): string | null {
  if (!applyDeadline) return null;
  const daysLeft = Math.ceil((new Date(applyDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return null;
  return daysLeft === 0 ? "D-DAY" : `D-${daysLeft}`;
}

interface JobCurationSectionProps {
  initialNew: JobCurationResult;
  heldQualifications: string[];
  bookmarkedIds: string[];
}

export function JobCurationSection({ initialNew, heldQualifications, bookmarkedIds }: JobCurationSectionProps) {
  const [activeTab, setActiveTab] = useState<JobCurationTab>("new");
  const [results, setResults] = useState<Partial<Record<JobCurationTab, JobCurationResult>>>({ new: initialNew });
  const [loadingTab, setLoadingTab] = useState<JobCurationTab | null>(null);

  /*
   * 가로 목록 좌우 끝을 흰색으로 흐린다. 카드가 뚝 잘려 보이는 대신 이어지는 느낌을 준다.
   * 갈 곳이 있는 쪽만 켜야 한다. 양쪽을 늘 켜두면 더 볼 게 없는데도 잘린 것처럼 보인다.
   */
  const rowRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ start: false, end: false });

  function syncFade() {
    const el = rowRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setFade({ start: el.scrollLeft > 1, end: el.scrollLeft < maxScroll - 1 });
  }
  const trackedTabs = useRef(new Set<JobCurationTab>(["new"]));

  useEffect(() => {
    void trackCurationTabViewedAction({ tab: "new" }).catch(() => {});
  }, []);

  // 탭이 바뀌면 목록이 통째로 갈리므로 스크롤 위치 기준을 다시 잡는다.
  const currentItemCount = results[activeTab]?.items.length ?? 0;
  useEffect(() => {
    rowRef.current?.scrollTo({ left: 0 });
    syncFade();
  }, [activeTab, currentItemCount]);

  function handleTab(tab: JobCurationTab) {
    setActiveTab(tab);
    if (!trackedTabs.current.has(tab)) {
      trackedTabs.current.add(tab);
      void trackCurationTabViewedAction({ tab }).catch(() => {});
    }
    if (!results[tab] && loadingTab !== tab) {
      setLoadingTab(tab);
      getJobCurationAction(tab)
        .then((r) => setResults((prev) => ({ ...prev, [tab]: r })))
        .catch(() => setResults((prev) => ({ ...prev, [tab]: { tab, state: "EMPTY", items: [] } })))
        .finally(() => setLoadingTab(null));
    }
  }

  const current = results[activeTab];

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-body-1 font-bold text-slate-900">큐레이션 JOB</h2>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => handleTab(t.key)}
            className={cn(filterPillClass, activeTab === t.key ? filterPillOnClass : filterPillOffClass)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loadingTab === activeTab && !current && (
        <p className="py-8 text-center text-label-1 text-slate-400">불러오는 중...</p>
      )}

      {current && current.items.length === 0 && (
        <p className="rounded-xl bg-slate-50 py-8 text-center text-label-1 text-slate-500">
          {EMPTY_MESSAGES[current.state] ?? EMPTY_MESSAGES.EMPTY}
        </p>
      )}

      {current && current.items.length > 0 && (
        <div className="relative">
        {/* 페이드는 스크롤을 가리면 안 되므로 클릭·스크롤을 통과시킨다. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent transition-opacity",
            fade.start ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent transition-opacity",
            fade.end ? "opacity-100" : "opacity-0",
          )}
        />
        <div ref={rowRef} onScroll={syncFade} className="scrollbar-on-hover flex gap-4 overflow-x-auto pb-2">
          {current.items.map((item) => {
            const dday = activeTab === "closing_soon" ? formatDday(item.job.applyDeadline) : null;
            return (
              <div
                key={item.job.id}
                className="w-72 shrink-0"
                onClickCapture={(e) => {
                  const t = e.target as HTMLElement;
                  if (t.closest("button")) return;
                  void trackCurationJobClickedAction({ tab: activeTab, jobId: item.job.id }).catch(() => {});
                }}
              >
                {item.unlockRequirementName && (
                  <p className="mb-1 text-label-2 font-semibold text-brand-blue-600">
                    {item.unlockRequirementName} 취득 시 지원 가능
                  </p>
                )}
                {dday && (
                  <p className="mb-1 text-label-2 font-semibold text-rose-600">{dday}</p>
                )}
                <JobCard
                  job={item.job}
                  matchScore={item.matchScore}
                  isAuthenticated
                  isBookmarked={bookmarkedIds.includes(item.job.id)}
                  heldQualifications={heldQualifications}
                />
              </div>
            );
          })}
        </div>
        </div>
      )}
    </section>
  );
}
