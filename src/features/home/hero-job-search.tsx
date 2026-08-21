"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 히어로 검색창. /jobs가 keyword 파라미터로 검색하므로 GET form으로 그대로 넘긴다.
 * 서버 액션이 필요 없고, 자바스크립트가 없어도 엔터로 동작한다.
 *
 * 검색 버튼은 입력이 있을 때만 보인다. 늘 띄워두면 바로 옆 CTA 두 개와 버튼이 셋이 되어
 * 무엇을 먼저 눌러야 할지 흐려진다. 입력을 시작한 순간에는 검색이 할 일이므로 그때 드러낸다.
 */
export function HeroJobSearch() {
  const [keyword, setKeyword] = useState("");
  const canSubmit = keyword.trim().length > 0;

  return (
    <form
      action="/jobs"
      className="mt-6 flex items-center gap-2 rounded-md border-2 border-brand-blue-200 bg-white py-2 pl-4 pr-2"
    >
      <Search className="size-5 shrink-0 text-brand-blue-600" />
      <input
        type="text"
        name="keyword"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="관심 직종, 기업을 검색해보세요"
        className="h-9 w-full text-label-1 text-slate-700 placeholder:text-slate-400 focus:outline-none"
        aria-label="관심 직종, 기업 검색"
      />
      {canSubmit && (
        <Button type="submit" size="sm" className="shrink-0 bg-brand-blue-400 hover:bg-brand-blue-600">
          검색
        </Button>
      )}
    </form>
  );
}
