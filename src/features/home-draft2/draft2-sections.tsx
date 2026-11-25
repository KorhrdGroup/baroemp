import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { ServiceIcon } from "@/features/home-draft/service-icons";

/*
  /draft2 시안: 정부 누리집 틀(큰 검색 · 자주 찾는 서비스 · 반듯한 목록)이 대부분이고,
  포켓컴퍼니 누리집에서 세 가지만 빌려 왔다 -
  ① 첫 화면의 짙은 남색 바탕과 큰 제목(보통 굵기 + 핵심 낱말만 굵게 · 파랗게)
  ② 제목 위 "오늘 날짜 · 숫자" 한 줄
  ③ 맨 아래 남색 상담 띠.
*/

const POPULAR = ["요양보호사", "경비", "미화", "조리", "운전", "사무보조"];

/** 첫 화면. 남색 판 위에 큰 제목과 정부 누리집식 큰 검색 칸을 둔다. */
export function Draft2Hero({ activeCount }: { activeCount: number | null }) {
  const today = new Date().toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" }).replace(/\.\s?/g, ".").replace(/\.$/, "");
  return (
    <section className="relative overflow-hidden bg-atomic-blue-900 pt-12 pb-24 sm:pt-16 sm:pb-32">
      {/* 오른쪽 위에서 번지는 옅은 파란 빛. 판이 납작해 보이지 않게만 깐다. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_0%,rgba(0,73,229,0.55),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4.5 lg:px-8">
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
          <label htmlFor="draft2-search" className="sr-only">
            일자리 검색
          </label>
          <input
            id="draft2-search"
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
              className="rounded-full border border-white/25 px-3 py-1 text-body-3 font-medium text-white"
            >
              {word}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const SERVICES = [
  { id: "jobs", label: "일자리 찾기", href: "/jobs" },
  { id: "assessment", label: "직업진단", href: "/assessment" },
  { id: "resume", label: "이력서 첨삭", href: "/resume" },
  { id: "coverLetter", label: "자기소개서", href: "/cover-letter" },
  { id: "support", label: "지원금 찾기", href: "/support" },
  { id: "consulting", label: "취업 상담", href: "/consulting" },
];

/**
 * 자주 찾는 서비스. 정부 누리집처럼 흰 판 하나를 칸막이로 나누고, 첫 화면 아래 끝에 반쯤 걸쳐 올린다.
 * 휴대폰은 3칸 × 2줄.
 */
export function Draft2ServiceGrid() {
  return (
    <nav aria-label="자주 찾는 서비스" className="relative mx-auto -mt-14 max-w-7xl px-4.5 sm:-mt-20 lg:px-8">
      <ul className="grid grid-cols-3 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] lg:grid-cols-6">
        {SERVICES.map((s, i) => (
          <li
            key={s.id}
            className={
              // 칸막이: 휴대폰은 셋째 칸 뒤에서 줄이 바뀌어 가로선을, 넓은 화면은 세로선만.
              `${i % 3 !== 0 ? "border-l" : ""} ${i >= 3 ? "border-t lg:border-t-0" : ""} ${i === 3 ? "lg:border-l" : ""} border-border`
            }
          >
            <Link href={s.href} className="flex flex-col items-center gap-2 px-2 py-5 sm:gap-3 sm:py-7">
              <ServiceIcon id={s.id} />
              <span className="text-body-2 font-semibold whitespace-nowrap text-slate-900 sm:text-body-1">{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** 맨 아래 상담 띠. 포켓컴퍼니의 마지막 남색 띠처럼 한 문장과 큰 단추 하나만 둔다. */
export function Draft2ConsultCta() {
  return (
    <section className="relative overflow-hidden bg-atomic-blue-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_90%_at_15%_100%,rgba(0,73,229,0.5),transparent_70%)]"
      />
      <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 px-4.5 py-12 sm:py-16 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-body-2 font-semibold text-[#7FAAFF]">무료 1:1 취업 상담</p>
          <h2 className="mt-2 text-title-1 leading-[1.35] font-medium tracking-[-0.03em] break-keep text-white sm:text-headline-2 sm:leading-[1.35]">
            혼자 찾기 어렵다면,
            <br />
            <strong className="font-extrabold">상담사가 같이 찾아드려요</strong>
          </h2>
        </div>
        <Link
          href="/consulting"
          className="flex h-14 shrink-0 items-center gap-1 rounded-xl bg-white px-7 text-body-1 font-bold text-atomic-blue-900 sm:h-16 sm:px-9"
        >
          상담 신청하기
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
