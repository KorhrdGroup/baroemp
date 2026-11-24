import Link from "next/link";
import { HeroJobSearch } from "./hero-job-search";

/** 공고가 실제로 넉넉한 말만 건다 (기존 홈의 인기검색어와 같은 목록). */
const KEYWORDS = ["요양보호사", "사회복지사", "사무·행정", "조리"];

/**
 * 시안 홈의 첫 판. 슬로건 대신 "무엇을 찾는지"를 묻고 바로 검색하게 한다.
 * 남색 판 하나에 질문·검색·공고 수를 모아, 휴대폰에서는 화면 위쪽 카드 한 장으로,
 * 넓은 화면에서는 왼쪽 큰 판으로 선다 (오른쪽에는 입구 카드가 온다).
 */
export function HeroSection({ jobCount }: { jobCount?: number }) {
  return (
    <div className="flex h-full flex-col justify-center rounded-2xl bg-brand-blue-900 px-5 py-7 text-white sm:px-10 sm:py-10">
      <h1 className="text-title-1 font-bold leading-[1.35] tracking-tight sm:text-headline-2">
        어떤 일을 찾고 계세요?
      </h1>

      <HeroJobSearch />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {KEYWORDS.map((keyword) => (
          <Link
            key={keyword}
            href={`/jobs?keyword=${encodeURIComponent(keyword)}`}
            className="rounded-full bg-white/10 px-3 py-1.5 text-label-1 text-white transition-colors hover:bg-white/20"
          >
            {keyword}
          </Link>
        ))}
      </div>

      {typeof jobCount === "number" && (
        <p className="mt-6 flex items-baseline justify-between gap-3 border-t border-white/15 pt-5 sm:mt-8">
          <span className="text-body-2 text-white/70">오늘 나를 기다리는 공고</span>
          <span className="text-title-2 font-bold sm:text-headline-3">
            {jobCount.toLocaleString()}
            <span className="ml-0.5 text-body-1 font-medium text-white/70">건</span>
          </span>
        </p>
      )}
    </div>
  );
}
