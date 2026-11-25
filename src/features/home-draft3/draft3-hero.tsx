import Link from "next/link";
import { Search } from "lucide-react";
import { CountUp } from "./count-up";

const POPULAR = ["요양보호사", "경비", "미화", "조리", "운전", "사무보조"];

/**
 * /draft3 첫 화면. /draft2 와 같은 남색 판 · 제목 · 검색 칸.
 * 많이 찾는 말 단추는 공고 탭과 같은 알약 모양.
 * (옅은 파랑 바탕도 견줘 봤지만 남색이 첫눈에 더 또렷해 남색으로 정했다.)
 */
export function Draft3Hero({ activeCount }: { activeCount: number | null }) {
  const today = new Date().toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" }).replace(/\.\s?/g, ".").replace(/\.$/, "");
  return (
    <section className="relative overflow-hidden bg-atomic-blue-900 pt-12 pb-24 sm:pt-16 sm:pb-32">
      {/* 오른쪽 위에서 번지는 옅은 파란 빛. 판이 납작해 보이지 않게만 깐다. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_0%,rgba(36,105,255,0.45),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4.5 lg:px-8">
        {activeCount !== null && (
          <p className="flex items-center gap-2 text-body-3 font-medium text-white/75 sm:text-body-2">
            <span>{today} 기준</span>
            <span aria-hidden className="h-3 w-px bg-white/30" />
            <span>
              진행 중인 공고 <CountUp value={activeCount} className="font-bold text-[#7CA5FF]" />건
            </span>
          </p>
        )}
        <h1 className="mt-4 text-headline-3 leading-[1.3] font-medium tracking-[-0.03em] break-keep text-white sm:text-headline-1 sm:leading-[1.3]">
          중장년 일자리, <strong className="font-extrabold">한 곳에서 찾고</strong>
          <br />
          <strong className="font-extrabold text-[#7CA5FF]">바로 지원</strong>까지
        </h1>

        {/* 정부 누리집처럼 폭 넓은 흰 검색 칸 하나. 일자리찾기(/jobs)가 keyword 로 받는다. */}
        <form action="/jobs" className="mt-8 flex h-14 max-w-3xl items-center rounded-xl bg-white pl-5 outline-offset-2 has-[input:focus-visible]:outline-[3px] has-[input:focus-visible]:outline-[#7CA5FF] sm:h-16">
          <label htmlFor="draft3-search" className="sr-only">
            일자리 검색
          </label>
          <input
            id="draft3-search"
            name="keyword"
            placeholder="예: 요양보호사, 경비"
            className="h-full min-w-0 flex-1 bg-transparent text-body-1 font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            className="m-1.5 flex h-[calc(100%-12px)] shrink-0 items-center gap-1.5 rounded-lg bg-atomic-blue-600 px-5 text-body-1 font-bold text-white sm:px-7"
          >
            <Search className="size-5" aria-hidden />
            검색
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-body-3 font-semibold text-white/75">많이 찾는 말</span>
          {POPULAR.map((word) => (
            <Link
              key={word}
              href={`/jobs?keyword=${encodeURIComponent(word)}`}
              className="rounded-full border border-white/25 px-3.5 py-1 text-body-3 font-medium text-white"
            >
              {word}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
