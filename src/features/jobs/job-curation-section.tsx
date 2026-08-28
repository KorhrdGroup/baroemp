"use client";

import { useEffect, useRef, useState } from "react";
import type { JobCurationResult, JobCurationTab } from "@/types";
import { cn } from "@/lib/utils";
import { filterPillClass, filterPillOffClass, filterPillOnSolidClass } from "@/lib/ui-classes";
import { JobCard } from "./job-card";
import {
  getAllJobCurationsAction,
  getJobCurationAction,
  trackCurationJobClickedAction,
  trackCurationTabViewedAction,
} from "./job-actions";

const TABS: { key: JobCurationTab; label: string }[] = [
  { key: "new", label: "신규 일자리" },
  { key: "closing_soon", label: "마감임박" },
  { key: "matched", label: "맞춤 추천" },
  { key: "ready_to_apply", label: "지금 지원가능" },
  { key: "unlockable", label: "자격 따면 열리는 공고" },
];

const EMPTY_MESSAGES: Record<string, string> = {
  EMPTY: "조건에 맞는 공고가 아직 없어요.",
  NEEDS_PROFILE: "희망직무를 설정하면 맞춤 공고를 보여드려요.",
};

interface JobCurationSectionProps {
  initialNew: JobCurationResult;
  bookmarkedIds: string[];
}

export function JobCurationSection({ initialNew, bookmarkedIds }: JobCurationSectionProps) {
  const [activeTab, setActiveTab] = useState<JobCurationTab>("new");
  const [results, setResults] = useState<Partial<Record<JobCurationTab, JobCurationResult>>>({ new: initialNew });
  const [loadingTabs, setLoadingTabs] = useState<Set<JobCurationTab>>(new Set());

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
  const inflight = useRef(new Set<JobCurationTab>());

  useEffect(() => {
    void trackCurationTabViewedAction({ tab: "new" }).catch(() => {});
  }, []);

  /*
    첫 화면은 신규 탭만 서버에서 받아 온다. 나머지 넷을 탭 누를 때 받으면 매번 0.5초를
    기다리는데, 호버 예열은 버튼에 머무는 시간이 그보다 짧아 잘 먹지 않았다.
    화면이 한가해진 뒤 한 요청으로 다섯 탭을 미리 받아 둔다.
    서버가 프로필·후보군을 한 벌만 조회하므로 탭 하나를 받는 비용과 비슷하다.
  */
  useEffect(() => {
    const idle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 200);
    const handle = idle(() => {
      getAllJobCurationsAction()
        .then((all) => {
          if (all.length === 0) return;
          setResults((prev) => {
            const next = { ...prev };
            // 이미 받아 둔 탭은 건드리지 않는다.
            for (const result of all) next[result.tab] ??= result;
            return next;
          });
        })
        .catch(() => {});
    });
    return () => {
      if (typeof window.cancelIdleCallback === "function" && typeof handle === "number") {
        window.cancelIdleCallback(handle);
      }
    };
  }, []);

  // 탭이 바뀌면 목록이 통째로 갈리므로 스크롤 위치 기준을 다시 잡는다.
  const currentItemCount = results[activeTab]?.items.length ?? 0;
  useEffect(() => {
    rowRef.current?.scrollTo({ left: 0 });
    syncFade();
  }, [activeTab, currentItemCount]);

  /**
   * 탭 내용을 받아 캐시에 넣는다. 이미 있거나 요청 중이면 아무것도 하지 않는다.
   *
   * 탭 버튼에 손이 닿는 순간(hover·focus·pointerdown) 불러두면 실제 클릭까지의
   * 100ms 남짓을 벌 수 있다. 다섯 탭을 처음부터 다 받아두지 않는 건, 열어보지도
   * 않을 탭까지 매 방문마다 조회하게 되기 때문이다.
   */
  function prefetchTab(tab: JobCurationTab) {
    if (results[tab] || inflight.current.has(tab)) return;
    inflight.current.add(tab);
    setLoadingTabs((prev) => new Set(prev).add(tab));
    getJobCurationAction(tab)
      .then((r) => setResults((prev) => ({ ...prev, [tab]: r })))
      .catch(() => setResults((prev) => ({ ...prev, [tab]: { tab, state: "EMPTY", items: [] } })))
      .finally(() => {
        inflight.current.delete(tab);
        setLoadingTabs((prev) => {
          const next = new Set(prev);
          next.delete(tab);
          return next;
        });
      });
  }

  function handleTab(tab: JobCurationTab) {
    setActiveTab(tab);
    if (!trackedTabs.current.has(tab)) {
      trackedTabs.current.add(tab);
      void trackCurationTabViewedAction({ tab }).catch(() => {});
    }
    prefetchTab(tab);
  }

  const current = results[activeTab];

  return (
    /*
      하늘색 판을 깔아 아래 검색 결과 목록과 갈라 놓는다.
      배경은 반투명으로 두지 않는다. 좌우 페이드가 같은 색을 solid 로 깔아서
      반투명이면 페이드 자리에만 진한 띠가 남는다.
    */
    <section className="mb-8 rounded-2xl bg-brand-blue-50 p-5 sm:p-6">
      {/* "큐레이션"은 주 이용층인 중장년에게 낯선 말이라 우리말 문구로 쓴다. */}
      <h2 className="mb-3 text-body-1 font-bold text-slate-900">이런 일자리 어때요?</h2>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => handleTab(t.key)}
            onPointerEnter={() => prefetchTab(t.key)}
            onPointerDown={() => prefetchTab(t.key)}
            onFocus={() => prefetchTab(t.key)}
            className={cn(filterPillClass, activeTab === t.key ? filterPillOnSolidClass : filterPillOffClass)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/*
        "불러오는 중" 한 줄로 바꾸면 카드가 통째로 사라져 판 높이가 접혔다 펴진다.
        그 들썩임 때문에 0.4초가 훨씬 길게 느껴졌다. 같은 크기의 빈 카드를 깔아
        높이를 붙들어 둔다.
      */}
      {loadingTabs.has(activeTab) && !current && (
        <div aria-busy="true" aria-label="불러오는 중" className="flex gap-4 overflow-hidden pb-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[222px] w-80 shrink-0 animate-pulse rounded-xl border border-border bg-white/60" />
          ))}
        </div>
      )}

      {current && current.items.length === 0 && (
        <p className="rounded-xl bg-white/70 py-8 text-center text-label-1 text-slate-500">
          {EMPTY_MESSAGES[current.state] ?? EMPTY_MESSAGES.EMPTY}
        </p>
      )}

      {current && current.items.length > 0 && (
        <div className="relative">
        {/* 페이드는 스크롤을 가리면 안 되므로 클릭·스크롤을 통과시킨다. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-brand-blue-50 to-transparent transition-opacity",
            fade.start ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-brand-blue-50 to-transparent transition-opacity",
            fade.end ? "opacity-100" : "opacity-0",
          )}
        />
        <div ref={rowRef} onScroll={syncFade} className="scrollbar-on-hover flex gap-4 overflow-x-auto pb-2">
          {current.items.map((item) => {
            return (
              <div
                key={item.job.id}
                className="w-80 shrink-0"
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
                <JobCard
                  job={item.job}
                  matchScore={item.matchScore}
                  isAuthenticated
                  isBookmarked={bookmarkedIds.includes(item.job.id)}
                  readiness={item.readiness}
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
