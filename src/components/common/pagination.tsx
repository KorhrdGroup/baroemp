import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** 한 번에 보여줄 페이지 번호 개수. KRDS 예시가 5개 단위라 그대로 따른다. */
const WINDOW_SIZE = 5;

/**
 * 현재 페이지가 창의 가운데 오도록 번호 구간을 잡는다.
 * 처음·마지막 근처에서는 구간이 밖으로 나가지 않게 붙여 놓아, 어디서든 같은 개수가 보인다.
 */
function pageWindow(page: number, totalPages: number): number[] {
  const half = Math.floor(WINDOW_SIZE / 2);
  let start = Math.max(1, page - half);
  const end = Math.min(totalPages, start + WINDOW_SIZE - 1);
  start = Math.max(1, end - WINDOW_SIZE + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

const CONTROL_CLASS =
  "flex size-10 items-center justify-center rounded-md border border-border text-slate-600 transition-colors hover:bg-slate-50";

/**
 * KRDS 페이지네이션.
 * 처음·이전 / 번호 / 다음·마지막 구성이고, 현재 페이지는 채운 버튼으로 표시한다.
 * 번호를 눌러 건너뛸 수 있어야 "1 / 6096" 같은 목록에서 원하는 지점으로 갈 수 있다.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
  className,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <nav aria-label="페이지" className={cn("flex items-center justify-center gap-1", className)}>
      {/* 비활성 상태는 링크 자체를 없애 키보드 이동에서도 건너뛰게 한다. */}
      {isFirst ? (
        <span aria-hidden className={cn(CONTROL_CLASS, "text-slate-300")}>
          <ChevronsLeft className="size-4" />
        </span>
      ) : (
        <Link href={buildHref(1)} aria-label="처음 페이지" className={CONTROL_CLASS}>
          <ChevronsLeft className="size-4" />
        </Link>
      )}

      {isFirst ? (
        <span aria-hidden className={cn(CONTROL_CLASS, "text-slate-300")}>
          <ChevronLeft className="size-4" />
        </span>
      ) : (
        <Link href={buildHref(page - 1)} aria-label="이전 페이지" className={CONTROL_CLASS}>
          <ChevronLeft className="size-4" />
        </Link>
      )}

      {pages.map((p) => {
        const current = p === page;
        return (
          <Link
            key={p}
            href={buildHref(p)}
            aria-label={`${p} 페이지`}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex size-10 items-center justify-center rounded-md text-label-1 transition-colors",
              current
                ? "bg-brand-blue-400 font-bold text-white"
                : "font-medium text-slate-600 hover:bg-slate-50",
            )}
          >
            {p}
          </Link>
        );
      })}

      {isLast ? (
        <span aria-hidden className={cn(CONTROL_CLASS, "text-slate-300")}>
          <ChevronRight className="size-4" />
        </span>
      ) : (
        <Link href={buildHref(page + 1)} aria-label="다음 페이지" className={CONTROL_CLASS}>
          <ChevronRight className="size-4" />
        </Link>
      )}

      {isLast ? (
        <span aria-hidden className={cn(CONTROL_CLASS, "text-slate-300")}>
          <ChevronsRight className="size-4" />
        </span>
      ) : (
        <Link href={buildHref(totalPages)} aria-label="마지막 페이지" className={CONTROL_CLASS}>
          <ChevronsRight className="size-4" />
        </Link>
      )}
    </nav>
  );
}
