import Link from "next/link";

/**
 * 히어로 검색창 아래 인기 검색어 줄.
 * 바로 위 검색창과 같은 곳(/jobs 키워드 검색)으로 보내야 "검색어"로 읽힌다.
 * 실제 등록 직종(mockJobRoles) 기준의 말만 걸어 첫 클릭이 빈 결과로 끝나지 않게 한다.
 */
// 한 줄에 들어가는 개수만 둔다. 줄이 넘어가면 검색창 아래 여백이 두 배로 벌어진다.
const KEYWORDS = ["요양보호사", "사회복지사", "사무·행정", "병원동행"];

export function HeroPopularKeywords() {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
      <span className="mr-1 shrink-0 text-label-1 font-semibold text-brand-blue-700">인기검색어</span>
      {KEYWORDS.map((keyword) => (
        <Link
          key={keyword}
          href={`/jobs?keyword=${encodeURIComponent(keyword)}`}
          className="rounded-full bg-white/80 px-3 py-1.5 text-label-1 text-slate-600 transition-colors hover:bg-white hover:text-brand-blue-700"
        >
          {keyword}
        </Link>
      ))}
    </div>
  );
}
