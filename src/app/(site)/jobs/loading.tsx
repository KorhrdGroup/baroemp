import { Skeleton } from "@/components/ui/skeleton";

/**
 * 일자리찾기 목록을 서버에서 불러오는 동안 보여주는 화면.
 *
 * 공고 검색은 수 초가 걸릴 수 있는데, 이 파일이 없으면 메뉴를 눌러도 이전 화면이 그대로 남아
 * 눌리지 않은 것처럼 보였다. 머리말은 page.tsx 와 같은 문구로 바로 띄우고, 나머지는 자리만 잡는다.
 */
export default function JobsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4.5 py-10 lg:px-8" aria-busy="true" aria-label="채용공고를 불러오는 중">
      <div className="mb-8">
        <p className="text-label-1 font-semibold text-brand-blue-600">일자리찾기</p>
        <h1 className="mt-1 text-title-2 font-bold text-slate-900 sm:text-headline-3">나에게 맞는 일자리를 찾아보세요</h1>
        <p className="mt-2 text-body-2-reading text-balance text-slate-500">
          실시간 채용정보를 조건에 맞게 확인하고, 관심 있는 공고에 바로 지원해보세요.
        </p>
      </div>

      {/* 검색바 */}
      <Skeleton className="h-14 w-full rounded-xl" />

      {/* 큐레이션 띠 */}
      <div className="mt-8 flex gap-4 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-56 w-80 shrink-0 rounded-xl" />
        ))}
      </div>

      {/* 전체 공고 */}
      <div className="mt-8">
        <Skeleton className="h-6 w-32" />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
