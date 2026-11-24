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
   * 사람인처럼 어느 화면에서든 공고를 검색할 수 있게 머리글에 검색창을 둔다.
   * 홈과 일자리찾기 목록은 화면 안에 검색창이 이미 있어 둘이 되므로 뺀다.
   */
  const showHeaderSearch = !onAuthScreen && pathname !== "/draft" && pathname !== "/jobs";

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
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4.5 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label={siteConfig.name} className="flex items-center">
            {/* 같은 그림 한 장이라 두 번 그려도 요청은 하나다. 좁은 화면에서는 한 단계 작게. */}
            <Logo height={18} priority className="lg:hidden" />
            <Logo height={20} priority className="hidden lg:block" />
          </Link>

          <nav className="hidden h-16 items-center gap-1 lg:flex">
            {mainNavItems.map((item) => {
              const current = isCurrentNav(item.href);
              return (
                // 인디케이터를 헤더 하단 테두리에 맞추려고 헤더 높이만큼 늘린 래퍼를 둔다.
                // 링크 자체는 기존 라운드 호버 배경을 유지한다.
                <div key={item.href} className="group relative flex h-full items-center">
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      // 활성 시 semibold로 굵어져도 폭이 흔들리지 않도록 고정폭을 준다.
                      // 26 = 가장 긴 라벨("이력서 첨삭")의 semibold 폭 73px + 좌우 여백.
                      "w-26 rounded-lg px-3 py-2 text-center text-body-2",
                      current ? "font-semibold text-brand-blue-600" : "font-medium text-slate-700",
                    )}
                  >
                    {item.label}
                  </Link>
                  {/*
                   * 고용24처럼 호버도 배경 박스가 아니라 하단 인디케이터로 표시한다.
                   * 막대가 왼쪽에서 오른쪽으로 채워지도록 scaleX를 쓴다(width 애니메이션은 리플로우를 유발).
                   * 키보드 이동만으로도 보이도록 focus-within을 함께 건다.
                   */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-0.5 origin-left transition-transform duration-200 ease-out",
                      current
                        ? "bg-brand-blue-600"
                        : "bg-brand-blue-300 scale-x-0 group-hover:scale-x-100",
                      // 호버는 인증 화면에서도 그대로 두고, 남은 포커스만 뺀다.
                      !current && !onAuthScreen && "group-focus-within:scale-x-100",
                    )}
                  />
                </div>
              );
            })}
          </nav>
        </div>

        {/*
          좁은 화면의 메뉴는 아래 탭(BottomTabBar)이 맡는다. 그래서 햄버거가 없고,
          로그인한 회원의 버튼들도 lg 부터만 보인다 - 좁은 화면에서는 아래 탭의 "마이"가 같은 곳이다.
        */}
        <div className="flex items-center gap-2">
          {showHeaderSearch && (
            // 메뉴와 버튼 사이가 넉넉한 xl 부터만 보인다. lg 에서는 메뉴 넷과 버튼 셋이 이미 줄을 채운다.
            <form
              action="/jobs"
              className="mr-2 hidden h-10 w-64 items-center rounded-lg border-2 border-brand-blue-400 bg-white pl-3.5 pr-1 xl:flex"
            >
              <input
                type="text"
                name="keyword"
                placeholder="일자리 검색"
                aria-label="일자리 검색"
                className="h-full w-full text-label-1 text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="검색"
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-brand-blue-600 hover:bg-brand-blue-50"
              >
                <Search className="size-5" />
              </button>
            </form>
          )}
          {user ? (
            <>
              {isAdmin && (
                <Button variant="ghost" size="sm" className="hidden text-slate-700 lg:inline-flex" asChild>
                  <Link href="/admin">관리자</Link>
                </Button>
              )}
              {/*
                로그인 상태의 주 동작. 비로그인일 때 회원가입이 맡던 자리를 그대로 잇는다.
                헤더 안에서는 기본 크기(48px)가 띠를 눌러 무겁다. 옆 버튼들과 함께 40px 로 맞춘다.
              */}
              <Button size="sm" className="hidden bg-brand-blue-400 hover:bg-brand-blue-600 lg:inline-flex" asChild>
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
            <Button size="sm" className="bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
              <Link href={loginHref}>로그인/회원가입</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
