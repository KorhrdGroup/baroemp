import Link from "next/link";
import { Search } from "lucide-react";
import { HeroIllustration } from "./hero-illustration";

const POPULAR = ["요양보호사", "경비", "미화", "조리", "운전", "사무보조"];

/**
 * /draft3 첫 화면. /draft2 와 같은 남색 판 · 제목 · 검색 칸에, 비어 있던 오른쪽 절반에 평면 그림 한 장(넓은 화면만).
 * 많이 찾는 말 단추는 페이지 다른 단추와 같은 8px 모서리로.
 */
export function Draft3Hero({ activeCount }: { activeCount: number | null }) {
  const today = new Date().toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" }).replace(/\.\s?/g, ".").replace(/\.$/, "");
  return (
    <section className="relative overflow-hidden bg-atomic-blue-900 pt-12 pb-24 sm:pt-16 sm:pb-32">
      {/* 오른쪽 위에서 번지는 옅은 파란 빛. 판이 납작해 보이지 않게만 깐다. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_0%,rgba(0,73,229,0.55),transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4.5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:px-8 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="min-w-0">
        {activeCount !== null && (
          <p className="flex items-center gap-2 text-body-3 font-medium text-white/75 sm:text-body-2">
            <span>{today} 기준</span>
            <span aria-hidden className="h-3 w-px bg-white/30" />
            <span>
              진행 중인 공고 <strong className="font-bold text-[#7FAAFF]">{activeCount.toLocaleString("ko-KR")}</strong>건
            </span>
          </p>
        )}
        <h1 className="mt-4 text-headline-3 leading-[1.3] font-medium tracking-[-0.03em] break-keep text-white sm:text-headline-1 sm:leading-[1.3]">
          중장년 일자리, <strong className="font-extrabold">한 곳에서 찾고</strong>
          <br />
          <strong className="font-extrabold text-[#7FAAFF]">바로 지원</strong>까지
        </h1>

        {/* 정부 누리집처럼 폭 넓은 흰 검색 칸 하나. 일자리찾기(/jobs)가 keyword 로 받는다. */}
        <form action="/jobs" className="mt-8 flex h-14 max-w-3xl items-center rounded-xl bg-white pl-5 sm:h-16">
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
              className="rounded-lg border border-white/25 px-3 py-1 text-body-3 font-medium text-white"
            >
              {word}
            </Link>
          ))}
        </div>
        </div>
        <HeroIllustration className="-mb-8 hidden w-full lg:block" />
      </div>
    </section>
  );
}
