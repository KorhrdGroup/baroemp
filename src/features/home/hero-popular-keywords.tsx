import Link from "next/link";

/**
 * 히어로 검색창 아래 인기 검색어 줄.
 * 자유 검색어가 아니라 실제로 이동할 화면을 짧은 말로 걸어둔다.
 * (검색 결과가 비는 키워드를 노출하면 첫 클릭이 빈 화면으로 끝난다)
 */
const KEYWORDS = [
  { label: "일자리", href: "/jobs" },
  { label: "직업진단", href: "/assessment" },
  { label: "지원금", href: "/support" },
  { label: "이력서", href: "/resume" },
  { label: "취업컨설팅", href: "/consulting" },
];

export function HeroPopularKeywords() {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
      <span className="mr-1 shrink-0 text-label-1 font-semibold text-brand-blue-700">인기검색어</span>
      {KEYWORDS.map((keyword) => (
        <Link
          key={keyword.href}
          href={keyword.href}
          className="rounded-full bg-white/80 px-3 py-1.5 text-label-1 text-slate-600 transition-colors hover:bg-white hover:text-brand-blue-700"
        >
          {keyword.label}
        </Link>
      ))}
    </div>
  );
}
