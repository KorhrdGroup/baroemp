"use client";

import { useRef, useState } from "react";
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

export interface ShowcaseTab {
  key: string;
  label: string;
  cards: ShowcaseCard[];
}

/**
 * 진단 소개 화면(직업진단 · 지원금 찾기)의 "모음" 구역. 포켓컴퍼니 Fund Raising 구역 참고:
 * 왼쪽은 머리말 · 두 줄 제목 · 기준일 · 큰 숫자 하나, 오른쪽은 분야 탭 + 옆으로 넘기는 카드.
 * 정보를 다 주는 곳이 아니라 맛보기라, 카드를 누르면 상세로 보내지 않고 진단을 시작한다.
 * 40~60대가 놓치지 않게 자동으로 넘기지 않고, 이전/다음은 큰 동그라미 단추로 둔다.
 */
export function DiagnosisShowcase({
  eyebrow,
  title,
  asOf,
  count,
  unit,
  note,
  listTitle,
  tabs,
  onStart,
}: {
  eyebrow: string;
  title: React.ReactNode;
  asOf: string;
  count: number;
  unit: string;
  note: string;
  listTitle: React.ReactNode;
  tabs: ShowcaseTab[];
  /** 카드를 누르면 시작 단추와 같은 동작. */
  onStart: () => void;
}) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  if (tabs.length === 0) return null;
  const current = tabs[Math.min(active, tabs.length - 1)];

  const scrollBy = (dir: 1 | -1) => {
    const el = listRef.current;
    if (!el) return;
    const card = el.querySelector("li");
    el.scrollBy({ left: dir * ((card?.clientWidth ?? 300) + 16), behavior: "smooth" });
  };

  return (
    <section className="border-t border-slate-100 py-14 sm:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-16">
        <div className="text-center lg:text-left">
          <p className="text-body-3 font-semibold text-slate-600">{eyebrow}</p>
          <h2 className="mt-1.5 text-title-2 leading-[1.4] font-extrabold tracking-[-0.02em] break-keep text-slate-900">{title}</h2>
          <p className="mt-8 text-body-3 font-semibold text-slate-600">{asOf} 기준</p>
          <p className="mt-1 text-[3.5rem] leading-none font-extrabold tracking-[-0.04em] text-slate-900 sm:text-[4.5rem]">
            {count.toLocaleString("ko-KR")}
            <span className="ml-1 text-headline-3 text-baro-blue sm:text-headline-2">{unit}</span>
          </p>
          <p className="mt-4 text-body-2 font-medium break-keep text-slate-600">{note}</p>
        </div>

        <div className="min-w-0">
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
            className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  className="flex h-full min-h-64 w-full flex-col rounded-card bg-baro-blue-50 p-6 text-left sm:p-7"
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
                    <span className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-5 text-body-3 font-bold text-slate-900">
                      내게 맞는지 확인하기
                      <ArrowRight aria-hidden className="size-4" />
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex justify-end gap-2">
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
      </div>
    </section>
  );
}
