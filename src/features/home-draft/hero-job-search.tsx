import { Search } from "lucide-react";

/**
 * 시안 홈의 검색창. /jobs 가 keyword 파라미터로 검색하므로 GET form 으로 그대로 넘긴다.
 * 남색 판 위에 놓여 흰 면만으로 충분히 도드라지므로 테두리는 두지 않는다.
 */
export function HeroJobSearch() {
  return (
    <form action="/jobs" className="mt-5 flex h-14 items-center gap-2 rounded-xl bg-white pl-5 pr-2 sm:mt-6 sm:h-16">
      <input
        type="text"
        name="keyword"
        placeholder="직종이나 회사 이름을 입력해보세요"
        aria-label="일자리 검색"
        className="h-full w-full text-body-2 text-slate-800 placeholder:text-slate-400 focus:outline-none sm:text-body-1"
      />
      <button
        type="submit"
        aria-label="검색"
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-brand-blue-400 text-white transition-colors hover:bg-brand-blue-600 sm:size-12"
      >
        <Search className="size-5 sm:size-6" />
      </button>
    </form>
  );
}
