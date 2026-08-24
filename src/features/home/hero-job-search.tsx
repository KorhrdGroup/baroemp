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
 *
 * 생김새는 바로 위 CTA 버튼 줄에 맞춘다. radius·테두리 두께·높이·글자 크기가
 * 조금씩 어긋나 있으면 같은 묶음인데도 따로 노는 것처럼 보인다.
 * 높이는 min-h-12 가 잡고(버튼과 같은 48px), 안쪽 요소는 그보다 작게 둔다.
 */
export function HeroJobSearch() {
  const [keyword, setKeyword] = useState("");
  const canSubmit = keyword.trim().length > 0;

  return (
    <form
      action="/jobs"
      className="mt-3 flex min-h-12 items-center gap-2 rounded-lg border border-brand-blue-200 bg-white pl-4 pr-1.5"
    >
      <Search className="size-5 shrink-0 text-brand-blue-600" />
      <input
        type="text"
        name="keyword"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="관심 직종, 기업을 검색해보세요"
        className="h-9 w-full text-body-2 text-slate-700 placeholder:text-slate-400 focus:outline-none"
        aria-label="관심 직종, 기업 검색"
      />
      {canSubmit && (
        <Button
          type="submit"
          size="sm"
          className="h-9 shrink-0 rounded-md bg-brand-blue-400 px-3 text-label-1 font-semibold hover:bg-brand-blue-600"
        >
          검색
        </Button>
      )}
    </form>
  );
}
