"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ShowcaseCard {
  id: string;
  title: string;
  /** 제목 아래 회색 한 줄(기관 이름 등). */
  sub?: string;
  /** 굵은 파랑 한 줄(지원 금액 등). 없으면 body 를 보인다. */
  highlight?: string;
  body?: string;
  /** 카드 맨 아래 작은 표시(필요 자격 등). tone 은 뜻이 있는 색(초록 = 바로 가능, 주황 = 준비 필요). */
  footnote?: { text: string; tone: "ready" | "prepare" };
}

/** 카드가 저절로 넘어가는 간격. 카드 한 장(제목 + 두 줄)을 읽을 만큼 둔다. */
const AUTO_ADVANCE_MS = 4000;

/** 카드 한 장 폭(+ 사이 16px)만큼 옆으로 민다. */
function scrollList(el: HTMLUListElement, dir: 1 | -1) {
  const card = el.querySelector("li");
  el.scrollBy({ left: dir * ((card?.clientWidth ?? 300) + 16), behavior: "smooth" });
}

export interface ShowcaseTab {
  key: string;
  label: string;
  cards: ShowcaseCard[];
}

/**
 * 진단 소개 화면(직업진단 · 지원금 찾기) 첫 칸 오른쪽의 "모음" 맛보기: 분야 탭 + 옆으로 넘기는 카드.
 * 왼쪽 설명 속 기준일 · 게시 수는 ShowcaseCount. 포켓컴퍼니 Fund Raising 구역 참고.
 * 정보를 다 주는 곳이 아니라 맛보기라, 카드를 누르면 상세로 보내지 않고 진단을 시작한다.
 * 카드는 몇 초마다 저절로 한 장씩 넘어가고, 끝에 닿으면 처음으로 돌아간다.
 * 40~60대가 읽다가 놓치지 않게 마우스를 올리거나 단추에 초점이 있는 동안, 움직임 줄이기 설정을 켠 기기에서는 멈춘다.
 * 이전/다음은 큰 동그라미 단추로 둔다.
 */
export function DiagnosisShowcase({
  listTitle,
  tabs,
  onStart,
}: {
  listTitle: React.ReactNode;
  tabs: ShowcaseTab[];
  /** 카드를 누르면 시작 단추와 같은 동작. */
  onStart: () => void;
}) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  /* 마우스가 올라가 있거나 초점이 안에 있으면 저절로 넘기지 않는다. 렌더를 다시 할 일이 아니라 ref 로 둔다. */
  const pausedRef = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const el = listRef.current;
      if (!el || pausedRef.current || document.hidden) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
      else scrollList(el, 1);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, []);

  if (tabs.length === 0) return null;
  const current = tabs[Math.min(active, tabs.length - 1)];

  const scrollBy = (dir: 1 | -1) => {
    if (listRef.current) scrollList(listRef.current, dir);
  };

  return (
    <div
      className="min-w-0"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onFocus={() => (pausedRef.current = true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) pausedRef.current = false;
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-1 font-semibold text-slate-700">{listTitle}</p>
        <div role="tablist" aria-label="분야" className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] max-sm:w-full [&::-webkit-scrollbar]:hidden">
          {tabs.map((t, i) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => {
                setActive(i);
                listRef.current?.scrollTo({ left: 0 });
              }}
              className={cn(
                "h-10 shrink-0 rounded-full px-4 text-body-3 font-bold whitespace-nowrap transition-colors duration-200",
                i === active ? "bg-baro-blue text-white" : "text-slate-600",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <ul
        ref={listRef}
        key={current.key}
        /* 마우스를 올린 카드의 그림자가 가로 스크롤 상자 가장자리에서 잘리지 않게 사방 12px 여유를 두고 바깥 여백으로 되돌린다. */
        className="-mx-3 mt-2 flex snap-x snap-mandatory scroll-px-3 gap-4 overflow-x-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {current.cards.map((c, i) => (
          <li
            key={c.id}
            className="w-[85%] shrink-0 snap-start motion-safe:animate-[situation-in_500ms_ease-out_backwards] sm:w-[19rem]"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <button
              type="button"
              onClick={onStart}
              className="flex h-full min-h-64 w-full flex-col rounded-card bg-white p-6 text-left transition-shadow duration-200 hover:shadow-hover sm:p-7"
            >
              <p className="text-body-3 font-bold text-baro-blue">{current.label}</p>
              <p className="mt-2 line-clamp-2 text-title-3 leading-[1.4] font-bold break-keep text-slate-900">{c.title}</p>
              {c.sub && <p className="mt-1.5 truncate text-body-3 font-medium text-slate-600">{c.sub}</p>}
              {c.highlight ? (
                <p className="mt-4 line-clamp-2 text-body-1 font-extrabold break-keep text-baro-blue">{c.highlight}</p>
              ) : (
                c.body && <p className="mt-4 line-clamp-2 text-body-3 font-medium break-keep text-slate-700">{c.body}</p>
              )}
              {c.footnote && (
                <p
                  className={cn(
                    "mt-3 line-clamp-1 text-body-3 font-semibold",
                    c.footnote.tone === "ready" ? "text-emerald-700" : "text-amber-700",
                  )}
                >
                  {c.footnote.text}
                </p>
              )}
              <span className="mt-auto pt-5">
                <span className="inline-flex h-11 items-center gap-1.5 rounded-full bg-baro-blue-50 px-5 text-body-3 font-bold text-baro-blue-600">
                  내게 맞는지 확인하기
                  <ArrowRight aria-hidden className="size-4" />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          aria-label="이전 카드"
          onClick={() => scrollBy(-1)}
          className="flex size-12 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          aria-label="다음 카드"
          onClick={() => scrollBy(1)}
          className="flex size-12 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}

/** 첫 칸 설명 첫머리의 기준일 + 게시 수(예: "26.11.26 기준 직업 29개"). 큰 숫자 칸을 따로 두지 않고 설명 속에 넣는다. */
export function ShowcaseCount({ asOf, label, count }: { asOf: string; label: string; count: number }) {
  return (
    <>
      {asOf} 기준 {label} <strong className="font-bold text-baro-blue-600">{count.toLocaleString("ko-KR")}개</strong>
    </>
  );
}
