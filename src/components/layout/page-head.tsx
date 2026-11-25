import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  세부 화면의 공통 바탕 (두 홈 시안 /draft · /draft2 어느 쪽에서 들어와도 어색하지 않게)
  - 바탕은 흰색, 덩어리는 얇은 선(border-border)과 둥근 모서리 12px(rounded-xl)로 나눈다. 그림자는 쓰지 않는다.
  - 제목은 굵게(800), 글자는 500 이상, 가장 옅은 글자는 slate-600(흰 바탕 대비 4.5:1 이상).
  - 파랑(atomic-blue-600)은 누르는 것과 핵심 숫자에만. 마감 임박만 빨강 #D04040.
  - 자잘한 호버 효과는 두지 않는다.
*/

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * 화면 머리: 위치(홈 › 일자리 찾기) → 큰 제목 → 한 줄 설명. 아래는 얇은 선으로 끊는다.
 * 정부 누리집의 "현재 위치"를 빌렸다 - 어디서 들어왔든 지금 어디 있는지 먼저 알려 준다.
 */
export function PageHead({
  crumbs,
  title,
  description,
  className,
  children,
}: {
  crumbs: Crumb[];
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  /** 제목 줄 오른쪽(넓은 화면) 또는 아래(휴대폰)에 놓을 것. */
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("border-b border-border bg-white", className)}>
      <div className="mx-auto max-w-6xl px-4.5 pt-6 pb-6 sm:pt-8 sm:pb-8 lg:px-8">
        <nav aria-label="현재 위치">
          <ol className="flex flex-wrap items-center gap-1 text-body-3 font-medium text-slate-600">
            {[{ label: "홈", href: "/" }, ...crumbs].map((c, i, all) => (
              <li key={`${c.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && <ChevronRight aria-hidden className="size-3.5 text-slate-500" />}
                {c.href && i < all.length - 1 ? (
                  <Link href={c.href}>{c.label}</Link>
                ) : (
                  <span aria-current={i === all.length - 1 ? "page" : undefined} className={i === all.length - 1 ? "text-slate-900" : undefined}>
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-title-1 font-extrabold tracking-[-0.02em] break-keep text-slate-900 sm:text-headline-3">{title}</h1>
            {description && <p className="mt-2 text-body-2 font-medium break-keep text-slate-600 sm:text-body-1">{description}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
