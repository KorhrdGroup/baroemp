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

/**
 * description 은 각 탭이 무엇을 고른 결과인지 한 줄로 알려준다.
 * 문구는 job-curation.service 의 실제 기준과 맞춰야 한다
 * (신규 3일 · 마감임박 7일 · 개인화 탭은 희망 직종/지역 후보군).
 * "자격 따면 열리는 공고"만 조건 이름이 회원마다 달라 화면에서 만든다.
 */
const TABS: { key: JobCurationTab; emoji: string; label: string; description?: string }[] = [
  { key: "new", emoji: "✨", label: "신규 일자리", description: "최근 3일 안에 올라온 공고예요." },
  { key: "closing_soon", emoji: "⏰", label: "마감임박", description: "일주일 안에 마감되는 공고예요." },
  {
    key: "matched",
    emoji: "🎯",
    label: "맞춤 추천",
    description: "희망 직종·지역을 기준으로 잘 맞는 순서로 골랐어요.",
  },
  {
    key: "assessment_matched",
    emoji: "🧭",
    label: "진단 맞춤 공고",
    description: "직업진단에서 성향이 잘 맞았던 직업의 최신 공고예요.",
  },
  {
    key: "ready_to_apply",
    emoji: "✅",
    label: "지금 지원가능",
    description: "지금 갖춘 조건만으로 지원할 수 있는 공고예요.",
  },
  { key: "unlockable", emoji: "🔑", label: "자격 따면 열리는 공고" },
];


/**
 * 카드 한 장의 높이. 빈 상태와 자리지킴 카드가 같은 자리를 잡아
 * 탭을 옮길 때 판이 접혔다 펴지지 않게 한다.
 * 내용이 가장 긴 카드가 249.2px 남짓이라, 조금 위에서 못박아야 어느 탭이든 같은 높이가 된다.
 * 최소높이를 내용보다 낮게 잡으면 내용 짧은 카드만 최소높이로 잘려 소수점만큼 덜컹인다.
 * JobCard 안쪽 여백이 바뀌면 이 값도 함께 맞춰야 한다.
 */
const CARD_HEIGHT = "min-h-[250px]";
/** 위 클래스와 같은 값. 줄 높이를 계산할 때 쓴다. */
const CARD_HEIGHT_PX = 250;

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

  /*
    카드 줄 높이 = 카드 + 가로 스크롤바가 차지하는 자리.
    스크롤바는 넘칠 때만 생겨, 카드가 한 장뿐인 탭이 그만큼 낮아 탭을 옮길 때 판이 덜컹였다.
    두께는 기기마다 다르다 - 데스크톱은 11px 남짓, 모바일은 화면 위에 겹쳐 떠서 0 이다.
    같은 규격(scrollbar-on-hover)의 자를 하나 만들어 재 두고, 그만큼만 더 잡는다.
    (scrollbar-gutter 는 세로 스크롤바에만 자리를 잡아줘 가로 줄에는 듣지 않는다.)
  */
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const probe = document.createElement("div");
    probe.className = "scrollbar-on-hover";
    probe.style.cssText = "position:absolute;visibility:hidden;overflow-x:scroll;width:100px;height:100px";
    document.body.appendChild(probe);
    const thickness = probe.offsetHeight - probe.clientHeight;
    probe.remove();
    /* 값은 상태가 아니라 CSS 변수로 흘린다. 그려진 판의 규격을 재서 판에 되돌려주는 일이다. */
    sectionRef.current?.style.setProperty("--curation-row-h", `${CARD_HEIGHT_PX + thickness}px`);
  }, []);
  const tabRowRef = useRef<HTMLDivElement>(null);
  const [tabFade, setTabFade] = useState({ start: false, end: false });

  function edgeState(el: HTMLDivElement | null) {
    if (!el) return { start: false, end: false };
    const maxScroll = el.scrollWidth - el.clientWidth;
    return { start: el.scrollLeft > 1, end: el.scrollLeft < maxScroll - 1 };
  }

  function syncFade() {
    setFade(edgeState(rowRef.current));
  }

  function syncTabFade() {
    setTabFade(edgeState(tabRowRef.current));
  }

  /*
    처음 그릴 때와 창 크기가 바뀔 때도 맞춰야 한다. 스크롤할 때만 맞추면, 넘치는데도
    오른쪽 흐림이 꺼져 있어 더 볼 것이 없는 줄로 읽힌다.
  */
  useEffect(() => {
    const sync = () => {
      setFade(edgeState(rowRef.current));
      setTabFade(edgeState(tabRowRef.current));
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);
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
    setFade(edgeState(rowRef.current));
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
  const unlockRequirementName = current?.items[0]?.unlockRequirementName;

  return (
    /*
      하늘색 판을 깔아 아래 검색 결과 목록과 갈라 놓는다.
      배경은 반투명으로 두지 않는다. 좌우 페이드가 같은 색을 solid 로 깔아서
      반투명이면 페이드 자리에만 진한 띠가 남는다.
    */
    <section ref={sectionRef} className="mb-8 rounded-2xl bg-brand-blue-50 p-5 pt-6 sm:p-6 sm:pt-8">
      {/* "큐레이션"은 주 이용층인 중장년에게 낯선 말이라 우리말 문구로 쓴다. */}
      {/*
        제목 4px · 탭 8px · 안내 8px 로 왼쪽을 조금씩 들여 둔다.
        모두 상자가 없는 요소라 판 끝(0px)에 그대로 붙으면 카드보다
        튀어나와 보인다. 제목은 글자가 굵어 더 튀므로 한 단계 덜 준다.
      */}
      <h2 className="mb-3 pl-1 text-body-1 font-bold text-slate-900">이런 일자리 어때요?</h2>
      {/* 카드 줄과 같은 방식. 좌우 끝을 판 색으로 흐려 잘린 것이 아니라 이어진다고 보이게 한다. */}
      <div className="relative mb-4">
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-brand-blue-50 to-transparent transition-opacity",
            tabFade.start ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-brand-blue-50 to-transparent transition-opacity",
            tabFade.end ? "opacity-100" : "opacity-0",
          )}
        />
        <div ref={tabRowRef} onScroll={syncTabFade} className="scrollbar-hidden flex gap-2 overflow-x-auto pb-1 pl-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => handleTab(t.key)}
            onPointerEnter={() => prefetchTab(t.key)}
            onPointerDown={() => prefetchTab(t.key)}
            onFocus={() => prefetchTab(t.key)}
            className={cn(
              filterPillClass,
              /*
                그림문자의 글자 상자는 한글보다 높아서, 그냥 글 안에 두면 줄 높이를 늘려
                글자가 위로 밀리고 아래쪽만 넓어 보인다. 칩을 flex 로 만들어 세로 가운데로 맞춘다.
              */
              "inline-flex items-center gap-1",
              activeTab === t.key ? filterPillOnSolidClass : filterPillOffClass,
            )}
          >
            {/* 그림문자는 읽어줄 것이 없다. 라벨이 이미 같은 말을 하므로 화면에서만 보이게 둔다. */}
            <span aria-hidden className="leading-none">
              {t.emoji}
            </span>
            {t.label}
            </button>
          ))}
        </div>
      </div>

      {/*
        "불러오는 중" 한 줄로 바꾸면 카드가 통째로 사라져 판 높이가 접혔다 펴진다.
        그 들썩임 때문에 0.4초가 훨씬 길게 느껴졌다. 같은 크기의 빈 카드를 깔아
        높이를 붙들어 둔다.
      */}
      {loadingTabs.has(activeTab) && !current && (
        <div
          aria-busy="true"
          aria-label="불러오는 중"
          className="flex min-h-[var(--curation-row-h,250px)] items-start gap-4 overflow-hidden"
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn("w-80 shrink-0 animate-pulse rounded-xl border border-border bg-white/60", CARD_HEIGHT)} />
          ))}
        </div>
      )}

      {current && current.items.length === 0 && (
        /* 카드 줄과 같은 높이로 세워, 빈 탭으로 옮겨도 판이 들썩이지 않게 한다. */
        <div className="flex min-h-[var(--curation-row-h,250px)] items-start">
          <div
            className={cn(
              "flex w-full items-center justify-center rounded-xl bg-white/70 px-6 text-center text-label-1 text-slate-500",
              CARD_HEIGHT,
            )}
          >
            {EMPTY_MESSAGES[current.state] ?? EMPTY_MESSAGES.EMPTY}
          </div>
        </div>
      )}

      {/*
        어떤 조건이 이 목록을 열어주는지는 공고마다 같으므로 줄 위에 한 번만 쓴다.
        카드마다 캡션을 얹으면 카드 윗변이 어긋난다.

        탭마다 무엇을 고른 결과인지 한 줄로 알려준다. 자리를 늘 잡아 두어
        (19.6px = label-1 한 줄) 탭을 옮겨도 판이 튀지 않는다.

        위아래 여백을 16px 로 맞추고, 왼쪽은 8px 들여 쓴다. 이 줄만 상자가 없어
        글자가 판 끝(0px)에 붙는데, 위 알약 글자는 17px·아래 카드 글자는 21px 에서
        시작해 혼자 튀어나와 보였다. 알약에 딱 맞추기보다 살짝만 들여 둔다.

        문구에 "자격"을 넣지 않는다. 조건 이름이 "요양보호사 자격"이면
        "자격 자격을"이 되고, "운전 가능"처럼 자격이 아닌 조건도 온다.
      */}
      {/*
        탭마다 문구 길이가 달라, 좁은 화면에서는 한 줄짜리와 두 줄짜리가 섞인다.
        그대로 두면 탭을 옮길 때 판이 19px 씩 오르내려, 좁은 화면에서는 두 줄을 미리 잡아 둔다.
      */}
      <p className="mb-4 min-h-[39.2px] pl-2 text-label-1 text-slate-600 sm:min-h-[19.6px]">
        {unlockRequirementName ? (
          <>
            <strong className="font-semibold text-brand-blue-700">{unlockRequirementName}</strong>
            {" "}하나만 채우면 지원할 수 있는 공고예요.
          </>
        ) : (
          TABS.find((t) => t.key === activeTab)?.description
        )}
      </p>

      {current && current.items.length > 0 && (
        /* 높이는 바깥 칸이 잡는다. 안쪽 스크롤 줄에 걸면 카드까지 늘어나, 스크롤바가 없는
           탭에서만 카드가 11px 더 길어진다. */
        <div className="relative min-h-[var(--curation-row-h,250px)]">
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
        {/*
          스크롤바는 넓은 화면에서 밀리는 줄임을 알려주는 표시라 남긴다(호버하면 드러난다).
          스크롤바가 차지하는 자리가 곧 카드 아래 여백이라 padding 은 주지 않는다.
        */}
        <div
          ref={rowRef}
          onScroll={syncFade}
          className="scrollbar-on-hover flex gap-4 overflow-x-auto"
        >
          {current.items.map((item) => {
            return (
              <div
                key={item.job.id}
                /* 한 장뿐인 탭에서는 옆에 늘어날 카드가 없어 내용 높이로 주저앉는다.
                   탭을 옮길 때마다 띠 높이가 널뛰지 않게 여기서도 최소 높이를 준다. */
                className={cn("w-80 shrink-0", CARD_HEIGHT)}
                onClickCapture={(e) => {
                  const t = e.target as HTMLElement;
                  if (t.closest("button")) return;
                  void trackCurationJobClickedAction({ tab: activeTab, jobId: item.job.id }).catch(() => {});
                }}
              >
                <JobCard
                  job={item.job}
                  matchReasonLabel={item.matchReasonLabel}
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
