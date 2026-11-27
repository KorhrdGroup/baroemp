import { Skeleton } from "@/components/ui/skeleton";
import { PageHead } from "@/components/layout/page-head";

/**
 * 일자리찾기 목록을 서버에서 불러오는 동안 보여주는 화면.
 *
 * 공고 검색은 수 초가 걸릴 수 있는데, 이 파일이 없으면 메뉴를 눌러도 이전 화면이 그대로 남아
 * 눌리지 않은 것처럼 보였다. 제목은 page.tsx 와 같은 문구로 바로 띄우고, 나머지는 같은 틀로 자리만 잡는다:
 * 흰 머리 안 추천 판(이런 일자리 어때요?) → 회색 바탕 검색바 → 전체 공고.
 * 추천 판은 하늘색 판 · 제목까지 미리 그려 둔다 - 회색 막대 자리에 하늘색 판이 갑자기 튀어나오지 않게.
 */
export default function JobsLoading() {
  return (
    // page.tsx 와 같은 머리 · 바탕(흰 머리 + 옅은 회색 바탕)이라 다 불러온 뒤 화면이 들썩이지 않는다.
    <div className="draft3-theme" aria-busy="true" aria-label="채용공고를 불러오는 중">
    <PageHead
      crumbs={[{ label: "일자리 찾기" }]}
      title="일자리 찾기"
      footer={
        // job-curation-section 의 판과 같은 크기 · 여백(카드 폭 · 최소 높이도 같게).
        <div className="mt-6 rounded-card bg-baro-blue-100 p-5 pt-6 sm:mt-8 sm:p-6 sm:pt-8">
          <h2 className="mb-3 pl-1 text-title-3 font-bold text-slate-900">이런 일자리 어때요?</h2>
          <div className="mb-4 flex gap-2 overflow-hidden pb-1 pl-2">
            {[28, 36, 32, 44, 30, 26].map((w, i) => (
              <Skeleton key={i} className="h-[39px] shrink-0 rounded-full bg-white/70" style={{ width: `${w * 0.25}rem` }} />
            ))}
          </div>
          <div className="flex min-h-[218px] gap-4 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                className="min-h-[218px] w-[85%] shrink-0 rounded-card bg-white sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]"
              />
            ))}
          </div>
        </div>
      }
    />
    <div className="bg-baro-page">
    <div className="mx-auto max-w-7xl px-4.5 pt-8 pb-16 lg:px-8">
      {/* 검색바(넓은 화면은 지역 · 직종까지 한 줄, 좁은 화면은 아래 두 칸) */}
      <div className="mb-8">
        <Skeleton className="h-14 w-full rounded-xl bg-white sm:h-16" />
        <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
          <Skeleton className="h-12 rounded-xl bg-white" />
          <Skeleton className="h-12 rounded-xl bg-white" />
        </div>
      </div>

      {/* 전체 공고 */}
      <Skeleton className="h-7 w-36 bg-white" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-52 rounded-card bg-white" />
        ))}
      </div>
    </div>
    </div>
    </div>
  );
}
