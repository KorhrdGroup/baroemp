import { Skeleton } from "@/components/ui/skeleton";
import { PageHead } from "@/components/layout/page-head";

/**
 * 일자리찾기 목록을 서버에서 불러오는 동안 보여주는 화면.
 *
 * 공고 검색은 수 초가 걸릴 수 있는데, 이 파일이 없으면 메뉴를 눌러도 이전 화면이 그대로 남아
 * 눌리지 않은 것처럼 보였다. 제목은 page.tsx 와 같은 문구로 바로 띄우고, 나머지는 같은 틀(왼쪽 조건 · 오른쪽 목록)로 자리만 잡는다.
 */
export default function JobsLoading() {
  return (
    // page.tsx 와 같은 머리 · 바탕(흰 머리 + 옅은 회색 바탕)이라 다 불러온 뒤 화면이 들썩이지 않는다. 뼈대는 회색 바탕 위라 흰색으로.
    <div className="draft3-theme" aria-busy="true" aria-label="채용공고를 불러오는 중">
    <PageHead icon="jobs" crumbs={[{ label: "일자리 찾기" }]} title="일자리 찾기" />
    <div className="bg-baro-page">
    <div className="mx-auto max-w-7xl px-4.5 pt-8 pb-16 lg:px-8">

      {/* 검색바 */}
      <Skeleton className="h-14 w-full rounded-card bg-white sm:h-16" />
      <Skeleton className="mt-2 h-12 w-full rounded-xl bg-white lg:hidden" />

      <div className="mt-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
        {/* 조건 판 */}
        <Skeleton className="hidden h-[32rem] rounded-card bg-white lg:block" />

        <div className="min-w-0">
          {/* 큐레이션 띠 */}
          <div className="mb-8 flex gap-4 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-56 w-80 shrink-0 rounded-card bg-white" />
            ))}
          </div>

          {/* 전체 공고 */}
          <Skeleton className="h-6 w-32 bg-white" />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-card bg-white" />
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}
