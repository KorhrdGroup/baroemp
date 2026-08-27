"use client";

import { useEffect, useRef, useState } from "react";
import type { JobCurationResult, JobCurationTab } from "@/types";
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
  NEEDS_ANALYSIS: "이력서 AI 점검 또는 커리어 진단을 먼저 해보세요.",
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
  const trackedTabs = useRef(new Set<JobCurationTab>(["new"]));

  useEffect(() => {
    void trackCurationTabViewedAction({ tab: "new" });
  }, []);

  function handleTab(tab: JobCurationTab) {
    setActiveTab(tab);
    if (!trackedTabs.current.has(tab)) {
      trackedTabs.current.add(tab);
      void trackCurationTabViewedAction({ tab });
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
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-label-1 font-semibold transition-colors ${
              activeTab === t.key
                ? "border-brand-blue-500 bg-brand-blue-50 text-brand-blue-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            }`}
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
        <div className="flex gap-4 overflow-x-auto pb-2">
          {current.items.map((item) => {
            const dday = activeTab === "closing_soon" ? formatDday(item.job.applyDeadline) : null;
            return (
              <div
                key={item.job.id}
                className="w-72 shrink-0"
                onClickCapture={() => void trackCurationJobClickedAction({ tab: activeTab, jobId: item.job.id })}
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
      )}
    </section>
  );
}
