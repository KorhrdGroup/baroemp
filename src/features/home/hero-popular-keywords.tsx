import Link from "next/link";

/**
 * 히어로 검색창 아래 인기 검색어 줄.
 * 바로 위 검색창과 같은 곳(/jobs 키워드 검색)으로 보내야 "검색어"로 읽힌다.
 * 실제 등록 직종(mockJobRoles) 기준의 말만 걸어 첫 클릭이 빈 결과로 끝나지 않게 한다.
 */
const KEYWORDS = ["요양보호사", "사회복지사", "사무·행정", "병원동행"];

export function HeroPopularKeywords() {
  return (
    <div className="mt-4">
      {/* 좁은 화면은 문구가 가운데 정렬이라 이름표도 가운데, 넓은 화면은 왼쪽에 붙인다. */}
      <p className="text-center text-label-1 font-semibold text-brand-blue-700 lg:text-left">인기검색어</p>

      {/*
        말은 접지 않고 한 줄로 세운다. 접히면 "병원동행" 하나가 아랫줄에 홀로 남아
        검색창 아래 여백이 두 배로 벌어진다. 좁아서 다 안 들어가면 옆으로 밀어 본다.
        가운데 정렬은 넘칠 때 왼쪽 끝이 잘리므로, 넘치지 않는 넓은 화면에서만 준다.
      */}
      <div className="-mx-6 mt-2 flex gap-2 overflow-x-auto px-6 pb-1 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
        {KEYWORDS.map((keyword) => (
          <Link
            key={keyword}
            href={`/jobs?keyword=${encodeURIComponent(keyword)}`}
            className="shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-label-1 text-slate-600 transition-colors hover:bg-white hover:text-brand-blue-700"
          >
            {keyword}
          </Link>
        ))}
      </div>
    </div>
  );
}
