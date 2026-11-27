import Image from "next/image";
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
    <section className="relative overflow-hidden bg-atomic-blue-900 pt-16 pb-28 sm:pt-24 sm:pb-44">
      {/* 바탕 그림: 흐릿한 비단 띠(반투명 가닥 여러 겹)가 넓게 펼쳐져 가로로 누운 태극의 S자처럼 느슨하게 흐르고(태극 흐름만 빌림, 원 · 문양 · 둥근 빛 덩어리는 없음).
          이미지 생성으로 만든 것, /draft3 두 파랑만. 남색 판 위에 옅게(60%) 흐려 깔아 띠가 은은하게 비치게 - 글이 늘 먼저 읽히게.
          S 굽이는 얕게, 그림 높이 가운데 1/3 안에만 두어 첫 화면 비율로 잘려도 끝까지 보인다. 흐림 가장자리가 비지 않게 살짝 키운다. 휴대폰은 더 옅게. */}
      <Image
        src="/draft3/hero-taeguk-silky.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="pointer-events-none scale-110 object-cover object-center opacity-50 blur-lg brightness-90 sm:opacity-75"
      />
      {/* S 선 아래 왼쪽 · 위 오른쪽의 둥근 빛 두 개. 태극의 맞물림만 겨우 느껴질 만큼 아주 옅게. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(30%_55%_at_18%_85%,rgba(36,105,255,0.22),transparent_70%),radial-gradient(28%_50%_at_78%_15%,rgba(124,165,255,0.16),transparent_70%)]"
      />
      {/* 글자 뒤 남색 막: 가운데 모은 글 뒤만 짙게, 바깥으로 갈수록 투명하게 - 제목 · 검색 칸이 띠보다 먼저 읽히고 양옆 띠는 살아 있게. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_75%_at_50%_45%,rgba(0,24,77,0.7),rgba(0,24,77,0.3)_60%,transparent_100%)]" />
      {/* 글은 가운데로 모은다 - 넓은 화면에서 왼쪽에 쏠려 보이지 않게. */}
      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4.5 text-center lg:px-8">
        {activeCount !== null && (
          <p className="flex items-center gap-2 text-body-3 font-medium text-white/75 sm:text-body-2">
            <span>{today} 기준</span>
            <span aria-hidden className="h-3 w-px bg-white/30" />
            <span>
              진행 중인 공고 <CountUp value={activeCount} className="font-semibold text-baro-blue-300" />건
            </span>
          </p>
        )}
        <h1 className="mt-5 text-headline-3 leading-[1.3] font-medium tracking-[-0.03em] break-keep text-white sm:text-headline-1 sm:leading-[1.3]">
          중장년 일자리, <strong className="font-extrabold">한 곳에서 찾고</strong>
          <br />
          <strong className="font-extrabold text-baro-blue-300">바로 지원</strong>까지
        </h1>

        {/* 정부 누리집처럼 폭 넓은 흰 검색 칸 하나. 일자리찾기(/jobs)가 keyword 로 받는다. */}
        <form action="/jobs" className="mt-10 flex h-14 w-full max-w-3xl items-center rounded-2xl bg-white pl-5 outline-offset-2 has-[input:focus-visible]:outline-[3px] has-[input:focus-visible]:outline-baro-blue-300 sm:h-16">
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
            className="m-1.5 flex h-[calc(100%-12px)] shrink-0 items-center gap-1.5 rounded-xl bg-atomic-blue-600 px-5 text-body-1 font-semibold text-white sm:px-7"
          >
            <Search className="size-5" aria-hidden />
            검색
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {/* 처음 열 때 이름표와 단어가 하나씩 차례로 아래에서 떠오른다(서비스 입구 칸과 같은 효과). */}
          <span className="text-body-3 font-semibold text-white/75 motion-safe:animate-[situation-in_500ms_ease-out_backwards]" style={{ animationDelay: "100ms" }}>
            인기 검색어
          </span>
          {POPULAR.map((word, i) => (
            <Link
              key={word}
              href={`/jobs?keyword=${encodeURIComponent(word)}`}
              className="rounded-full bg-white/70 px-3.5 py-1 text-body-3 font-semibold text-baro-navy motion-safe:animate-[situation-in_500ms_ease-out_backwards]"
              style={{ animationDelay: `${170 + i * 70}ms` }}
            >
              {word}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
