"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAuthPath } from "@/lib/auth/redirect";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mainNavItems, siteConfig } from "@/lib/site-config";
import { Logo } from "@/components/layout/logo";
import { ScreenScaleControl } from "./screen-scale-control";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/features/auth/auth-actions";
import { isAdminRole } from "@/lib/auth/roles";
import type { AppRole } from "@/types";

export interface SiteHeaderUser {
  name?: string;
  email?: string;
  role: AppRole;
}

export function SiteHeaderDraft({ user }: { user: SiteHeaderUser | null }) {
  const isAdmin = user ? isAdminRole(user.role) : false;

  // 하위 경로(/jobs/job-001, /resume/new 등)에서도 해당 메뉴를 선택 상태로 둔다.
  const pathname = usePathname();
  /*
   * 로그인 화면에서는 내비 밑줄의 focus-within 만 끈다.
   * 보호 페이지 메뉴를 클릭해 로그인으로 튕기면 그 링크에 포커스가 남고,
   * 마우스를 치워도 밑줄이 계속 켜진 채라 엉뚱한 메뉴가 선택된 것처럼 보인다.
   * 호버 반응은 로그인 화면에서도 그대로 살려둔다.
   */
  const onAuthScreen = isAuthPath(pathname);
  // 로그인 후 보던 화면으로 돌아오게 한다. 없으면 마이페이지로 떨어진다.
  const loginHref = onAuthScreen ? "/login" : `/login?next=${encodeURIComponent(pathname)}`;
  const isCurrentNav = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  /*
   * 사람인처럼 검색창이 머리글의 주인공이다. 로고 · 검색 · 로그인을 한 줄에 두고 메뉴는 아래 줄로 내린다.
   * 일자리찾기 목록은 화면 안에 검색창이 이미 있어 둘이 되므로 뺀다.
   */
  const showHeaderSearch = !onAuthScreen && pathname !== "/jobs";
  return (
    <>
    {/*
     * 고용24처럼 머리글 위에 얇은 보조 줄을 둔다. 스크롤하면 같이 올라가고 머리글만 붙어 남는다 -
     * 붙는 높이(64px)가 바뀌면 화면마다 맞춰 둔 scroll-mt 값이 어긋난다.
     * 좁은 화면은 브라우저의 두 손가락 확대가 있어 넓은 화면에만 둔다.
     */}
    <div className="hidden border-b border-border/70 bg-gov-surface lg:block">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-end px-8">
        <ScreenScaleControl />
      </div>
    </div>
    {/*
      넓은 화면은 두 줄(로고·검색·로그인 / 메뉴)이 붙어 따라온다. 휴대폰은 두 줄이 붙으면 화면의
      1/6을 먹어 붙이지 않는다 - 메뉴는 아래 탭이 늘 붙어 있다.
    */}
    <header className="z-50 w-full border-b border-border/70 bg-white lg:sticky lg:top-0">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4.5 lg:h-20 lg:gap-10 lg:px-8">
        <Link href="/" aria-label={siteConfig.name} className="flex shrink-0 items-center">
          {/* 같은 그림 한 장이라 두 번 그려도 요청은 하나다. 좁은 화면에서는 한 단계 작게. */}
          <Logo height={18} priority className="lg:hidden" />
          <Logo height={24} priority className="hidden lg:block" />
        </Link>

        {showHeaderSearch && <HeaderSearch className="hidden flex-1 lg:flex lg:max-w-xl" />}

        {/*
          좁은 화면의 메뉴는 아래 탭(BottomTabBar)이 맡는다. 그래서 햄버거가 없고,
          로그인한 회원의 버튼들도 lg 부터만 보인다 - 좁은 화면에서는 아래 탭의 "마이"가 같은 곳이다.
        */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {user ? (
            <>
              {isAdmin && (
                <Button variant="ghost" size="sm" className="hidden text-slate-700 lg:inline-flex" asChild>
                  <Link href="/admin">관리자</Link>
                </Button>
              )}
              <Button size="sm" className="hidden bg-brand-blue-600 hover:bg-brand-blue-700 lg:inline-flex" asChild>
                <Link href="/mypage">마이페이지</Link>
              </Button>
              <form action={signOutAction} className="hidden lg:inline-flex">
                <Button type="submit" variant="ghost" size="sm" className="text-slate-700">
                  로그아웃
                </Button>
              </form>
            </>
          ) : (
            /* 버튼 하나로 합쳤다. 회원가입은 로그인 화면 하단 링크로 이어진다. */
            <Button size="sm" className="bg-brand-blue-600 hover:bg-brand-blue-700" asChild>
              <Link href={loginHref}>로그인/회원가입</Link>
            </Button>
          )}
        </div>
      </div>

      {/* 휴대폰: 검색창을 로고 아래 한 줄로. */}
      {showHeaderSearch && (
        <div className="px-4.5 pb-3 lg:hidden">
          <HeaderSearch className="flex" />
        </div>
      )}

      {/* 넓은 화면: 메뉴 줄. 지금 있는 메뉴는 아래 막대로 표시한다. */}
      <nav aria-label="주 메뉴" className="hidden border-t border-border/70 lg:block">
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-2 px-8">
          {mainNavItems.map((item) => {
            const current = isCurrentNav(item.href);
            return (
              <div key={item.href} className="group relative flex h-full items-center">
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    // 활성 시 굵어져도 폭이 흔들리지 않도록 고정폭을 준다.
                    "w-28 px-3 py-2 text-center text-body-1",
                    current ? "font-bold text-brand-blue-600" : "font-semibold text-slate-800 hover:text-slate-950",
                  )}
                >
                  {item.label}
                </Link>
                {/* 막대가 왼쪽에서 오른쪽으로 채워지도록 scaleX를 쓴다(width 애니메이션은 리플로우를 유발). */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 origin-left transition-transform duration-200 ease-out",
                    current ? "bg-brand-blue-600" : "bg-brand-blue-300 scale-x-0 group-hover:scale-x-100",
                    !current && !onAuthScreen && "group-focus-within:scale-x-100",
                  )}
                />
              </div>
            );
          })}
        </div>
      </nav>
    </header>
    </>
  );
}

/**
 * 머리글 검색창. /jobs 가 keyword 파라미터로 검색하므로 GET form 으로 그대로 넘긴다.
 * 사람인처럼 둥근 파란 테두리로 머리글에서 가장 먼저 눈에 들어오게 한다.
 */
function HeaderSearch({ className }: { className?: string }) {
  return (
    <form
      action="/jobs"
      role="search"
      className={cn(
        "h-12 items-center rounded-full border-2 border-brand-blue-600 bg-white pr-1.5 pl-5 lg:h-[52px]",
        className,
      )}
    >
      <Search className="size-5 shrink-0 text-brand-blue-600" />
      <input
        type="text"
        name="keyword"
        placeholder="직종이나 회사 이름 (예: 요양보호사)"
        aria-label="일자리 검색"
        className="h-full w-full min-w-0 bg-transparent px-3 text-body-2 text-slate-800 placeholder:text-slate-400 focus:outline-none lg:text-body-1"
      />
      <button
        type="submit"
        className="h-9 shrink-0 cursor-pointer rounded-full bg-brand-blue-600 px-5 text-label-1 font-semibold text-white hover:bg-brand-blue-700 lg:h-10"
      >
        검색
      </button>
    </form>
  );
}
