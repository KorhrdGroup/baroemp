import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * 히어로 검색창 아래 인기 검색어 줄.
 * 바로 위 검색창과 같은 곳(/jobs 키워드 검색)으로 보내야 "검색어"로 읽힌다.
 * 실제 등록 직종(mockJobRoles) 기준의 말만 걸어 첫 클릭이 빈 결과로 끝나지 않게 한다.
 */
const KEYWORDS = ["요양보호사", "사회복지사", "사무·행정", "병원동행"];

/**
 * 화면이 넓어지는 대로 하나씩 더 보여준다. 줄이 접히면 하나가 아랫줄에 홀로 남아
 * 검색창 아래 여백이 두 배로 벌어지므로, 접느니 감춘다.
 *
 * 이름표까지 넣어 셋이 한 줄에 서려면 333px 이 필요하다(390px 화면에서 잰 값).
 * 좌우 여백 24px 씩을 빼면 화면이 381px 은 되어야 해서, 384px 을 문턱으로 잡는다.
 */
const REVEAL_AT = ["", "", "hidden min-[384px]:block", "hidden sm:block"];

export function HeroPopularKeywords() {
  return (
    <div className="mt-4 flex items-center justify-center gap-2 lg:justify-start">
      <span className="mr-1 shrink-0 text-label-1 font-semibold text-brand-blue-700">인기검색어</span>
      {KEYWORDS.map((keyword, i) => (
        <Link
          key={keyword}
          href={`/jobs?keyword=${encodeURIComponent(keyword)}`}
          className={cn(
            "shrink-0 rounded-full bg-brand-blue-100/70 px-3 py-1.5 text-label-1 text-brand-blue-700 transition-colors hover:bg-brand-blue-100",
            REVEAL_AT[i],
          )}
        >
          {keyword}
        </Link>
      ))}
    </div>
  );
}
