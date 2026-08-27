"use client";

import { useState } from "react";
import { Search } from "lucide-react";

/**
 * 히어로 검색창. /jobs가 keyword 파라미터로 검색하므로 GET form으로 그대로 넘긴다.
 * 서버 액션이 필요 없고, 자바스크립트가 없어도 엔터로 동작한다.
 *
 * 배너에서 가장 먼저 눈에 들어와야 하는 요소라 높이를 크게 잡고 테두리도 두껍게 둔다.
 * 검색 버튼은 입력 여부와 무관하게 항상 보인다(옆에 경쟁하는 CTA가 없다).
 */
export function HeroJobSearch() {
  const [keyword, setKeyword] = useState("");

  return (
    <form
      action="/jobs"
      className="mt-8 flex h-14 items-center gap-2 rounded-xl border-2 border-brand-blue-400 bg-white pl-5 pr-2"
    >
      <input
        type="text"
        name="keyword"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="관심 직종, 기업을 검색해보세요"
        className="h-full w-full text-body-2 text-slate-700 placeholder:text-slate-400 focus:outline-none"
        aria-label="관심 직종, 기업 검색"
      />
      <button
        type="submit"
        aria-label="검색"
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-brand-blue-600 transition-colors hover:bg-brand-blue-50"
      >
        <Search className="size-6" />
      </button>
    </form>
  );
}
