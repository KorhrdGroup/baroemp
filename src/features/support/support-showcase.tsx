"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupportShowcase } from "@/services/support-search.service";

/**
 * 지원금 찾기 소개의 "분야별 대표 지원제도" 구역. 포켓컴퍼니 Fund Raising 구역 참고:
 * 왼쪽은 머리말 · 두 줄 제목 · 기준일 · 큰 숫자 하나, 오른쪽은 분야 탭 + 옆으로 넘기는 카드.
 * 40~60대가 놓치지 않게 자동으로 넘기지 않고, 이전/다음은 큰 동그라미 단추로 둔다.
 */
export function SupportShowcaseSection({ data, asOf }: { data: SupportShowcase; asOf: string }) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  if (data.categories.length === 0) return null;
  const current = data.categories[Math.min(active, data.categories.length - 1)];

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
          <p className="text-body-2 font-bold text-slate-500">지원제도 모음</p>
          <h2 className="mt-2 text-title-1 leading-[1.35] font-extrabold tracking-[-0.03em] break-keep text-slate-900 sm:text-headline-3">
            놓치기 쉬운 <span className="text-baro-blue">지원제도</span>를
            <br />
            <span className="text-baro-blue">한곳에</span> 모았어요
          </h2>
          <p className="mt-8 text-body-3 font-semibold text-slate-500">{asOf} 기준</p>
          <p className="mt-1 text-[3.5rem] leading-none font-extrabold tracking-[-0.04em] text-slate-900 sm:text-[4.5rem]">
            {data.totalCount.toLocaleString("ko-KR")}
            <span className="ml-1 text-headline-3 text-baro-blue sm:text-headline-2">개</span>
          </p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-1 font-semibold text-slate-700">
              분야별 <strong className="font-extrabold text-baro-blue">대표 지원제도</strong>
            </p>
            <div role="tablist" aria-label="지원 분야" className="flex flex-wrap gap-1.5">
              {data.categories.map((c, i) => (
                <button
                  key={c.category}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  onClick={() => {
                    setActive(i);
                    listRef.current?.scrollTo({ left: 0 });
                  }}
                  className={cn(
                    "h-10 rounded-full px-4 text-body-3 font-bold transition-colors duration-200",
                    i === active ? "bg-baro-blue text-white" : "text-slate-600",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <ul
            ref={listRef}
            key={current.category}
            className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {current.programs.map((p, i) => (
              <li
                key={p.id}
                className="w-[85%] shrink-0 snap-start motion-safe:animate-[situation-in_500ms_ease-out_backwards] sm:w-[19rem]"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <Link
                  href={`/support/${p.id}`}
                  className="flex h-full min-h-72 flex-col rounded-card bg-baro-navy p-6 text-white sm:p-7"
                >
                  <p className="text-body-3 font-bold text-baro-blue-300">{current.label}</p>
                  <p className="mt-2 line-clamp-2 text-title-3 leading-[1.4] font-bold break-keep">{p.title}</p>
                  <p className="mt-1.5 truncate text-body-3 font-medium text-white/70">{p.organization}</p>
                  {p.supportAmountText ? (
                    <p className="mt-4 line-clamp-2 text-body-1 font-extrabold break-keep text-baro-blue-300">{p.supportAmountText}</p>
                  ) : (
                    <p className="mt-4 line-clamp-2 text-body-3 font-medium break-keep text-white/80">{p.summary}</p>
                  )}
                  <span className="mt-auto inline-flex h-11 items-center gap-1.5 self-start rounded-full bg-white px-5 text-body-3 font-bold text-baro-navy">
                    자세히 보기
                    <ArrowRight aria-hidden className="size-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              aria-label="이전 지원제도"
              onClick={() => scrollBy(-1)}
              className="flex size-12 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="다음 지원제도"
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
