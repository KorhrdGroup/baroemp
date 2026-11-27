import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ServiceIcon } from "@/features/home-draft/service-icons";
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
 * 화면 머리: 위치(홈 › 일자리 찾기) → 큰 제목 → 한 줄 설명.
 * 정부 누리집의 "현재 위치"를 빌렸다 - 어디서 들어왔든 지금 어디 있는지 먼저 알려 준다.
 * 바탕은 홈 시안 지원금 배너와 같은 옅은 하늘색 그라데이션 + 물결 선이고, 오른쪽에 그 서비스의 그림(icon)을 크게 둔다 -
 * 흰 바탕 · 얇은 선뿐인 세부 화면이 밋밋해 보여, 화면 첫머리에서만 꾸밈을 준다.
 * /draft3 색 판(.draft3-theme) 안에서는 그라데이션 · 물결 없이 옅은 하늘색(#EFF4FF) 한 면으로 - 두 파랑 구성에 맞춘다.
 */
export function PageHead({
  crumbs,
  title,
  description,
  icon,
  className,
  children,
  footer,
}: {
  crumbs: Crumb[];
  title: React.ReactNode;
  description?: React.ReactNode;
  /** 오른쪽에 크게 놓을 서비스 그림(service-icons 의 id: jobs · support · assessment · resume · coverLetter · consulting). */
  icon?: string;
  className?: string;
  /** 제목 줄 오른쪽(넓은 화면) 또는 아래(휴대폰)에 놓을 것. */
  children?: React.ReactNode;
  /** 제목 아래 온 폭으로 놓을 것(일자리 찾기의 검색창 · 조건 줄처럼 머리와 한 덩어리로 읽혀야 하는 것). */
  footer?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-r from-[#E4EEFF] via-[#EEF4FF] to-[#F6F9FF] in-[.draft3-theme]:border-b in-[.draft3-theme]:border-border in-[.draft3-theme]:bg-white in-[.draft3-theme]:bg-none",
        className,
      )}
    >
      <Waves />
      <div className="relative mx-auto flex max-w-7xl items-center gap-6 px-4.5 pt-6 pb-7 sm:pt-8 sm:pb-10 lg:px-8">
        <div className="min-w-0 flex-1">
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
              {description && <p className="mt-2 text-body-2 font-medium break-keep text-slate-700 sm:text-body-1">{description}</p>}
            </div>
            {children}
          </div>
          {footer}
        </div>
        {/* 그림은 흰 동그라미 위에(draft3 는 머리가 흰색이라 옅은 하늘 동그라미). 휴대폰은 제목 자리가 좁아 감춘다. */}
        {icon && (
          <div aria-hidden className="hidden size-28 shrink-0 items-center justify-center rounded-full bg-white/80 md:flex in-[.draft3-theme]:bg-baro-blue-50 [&>svg]:size-16">
            <ServiceIcon id={icon} />
          </div>
        )}
      </div>
    </div>
  );
}

/** 바탕의 물결 선. 홈 시안 지원금 배너(support-banner.tsx)와 같은 선 묶음. */
function Waves() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 200"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full text-brand-blue-400 in-[.draft3-theme]:hidden"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <path
          key={i}
          d={`M0 ${150 - i * 6} C 250 ${40 + i * 8}, 500 ${200 - i * 4}, 750 ${90 + i * 5} S 1100 ${20 + i * 7}, 1200 ${70 + i * 4}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity={0.1 + i * 0.015}
        />
      ))}
    </svg>
  );
}
