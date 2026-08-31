"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAuthPath } from "@/lib/auth/redirect";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mainNavItems, siteConfig } from "@/lib/site-config";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/features/auth/auth-actions";
import { isAdminRole } from "@/lib/auth/roles";
import type { AppRole } from "@/types";

export interface SiteHeaderUser {
  name?: string;
  email?: string;
  role: AppRole;
}

export function SiteHeaderClient({ user }: { user: SiteHeaderUser | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label={siteConfig.name} className="flex items-center">
            <Logo height={20} priority />
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
          오른쪽 버튼들은 lg 부터 보인다. 태블릿에서는 가운데 메뉴가 이미 햄버거로 접혀 있는데
          여기만 남아 있으면, 메뉴가 두 군데로 갈린다.
        */}
        <div className="flex items-center gap-2">
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
            <Button size="sm" className="hidden bg-brand-blue-400 hover:bg-brand-blue-600 lg:inline-flex" asChild>
              <Link href={loginHref}>로그인/회원가입</Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            /*
              열려 있는 동안 회색 배경이 깔리던 것을 없앤다(ghost 의 aria-expanded 기본값).
              아이콘이 X 로 바뀌어 이미 열린 상태를 말하고 있어, 배경까지 깔면 눌린 채로 굳어 보인다.
            */
            className="lg:hidden aria-expanded:bg-transparent"
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/*
       * 모바일 메뉴. 헤더(로고)는 그대로 두고 그 아래로 내려온다.
       *
       * absolute + top-full 로 헤더 아래에 겹쳐 띄운다. 문서 흐름에 두면 열 때마다
       * 아래 콘텐츠가 통째로 밀려 화면이 출렁인다.
       * 높이를 애니메이션하면(max-height/grid-rows) 콘텐츠 높이와 어긋나 덜컥거린다.
       * 대신 바깥 칸으로 오려내고(overflow-hidden) 안쪽 판을 제 높이만큼 위로 올려 둔다.
       * 열리면 제자리로 내려오므로, 헤더 밑에서 판이 빠져나오는 것처럼 보인다.
       * 그림자가 잘리지 않게 아래쪽만 여유를 둔다. 닫혔을 때는 invisible 로 포커스에서도 빠진다.
       */}
      <div
        id="mobile-menu"
        className={cn(
          "absolute inset-x-0 top-full overflow-hidden pb-4 transition-[visibility] duration-300 lg:hidden",
          mobileOpen ? "visible" : "invisible",
        )}
      >
        {/* 그림자는 아래로만 드리운다. shadow-lg 는 사방으로 퍼져 바로 위 헤더 밑단을 어둡게 눌렀다. */}
        <nav
          className={cn(
            "mx-auto flex max-h-[80vh] max-w-7xl flex-col gap-1 overflow-y-auto border-b border-border/70 bg-white px-6 py-3 shadow-[0_12px_16px_-8px_rgba(15,23,42,0.18)] transition-transform duration-300 ease-out",
            mobileOpen ? "translate-y-0" : "-translate-y-full",
          )}
        >
        {mainNavItems.map((item) => {
          const current = isCurrentNav(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              aria-current={current ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-3 text-body-2 hover:bg-brand-blue-50",
                current ? "font-semibold text-brand-blue-600" : "font-medium text-slate-700",
              )}
            >
              {item.label}
            </Link>
          );
        })}
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          {user ? (
            <>
              {isAdmin && (
                <Button variant="outline" asChild>
                  <Link href="/admin" onClick={() => setMobileOpen(false)}>
                    관리자
                  </Link>
                </Button>
              )}
              {/*
                로그인 상태의 주 동작은 마이페이지다. 채운 버튼은 여기에 준다 - 전에는
                로그아웃이 채워져 있어, 메뉴를 열면 나가는 버튼이 제일 먼저 눈에 들어왔다.
              */}
              <Button asChild>
                <Link href="/mypage" onClick={() => setMobileOpen(false)}>
                  마이페이지
                </Link>
              </Button>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" className="w-full">
                  로그아웃
                </Button>
              </form>
            </>
          ) : (
            <>
              {/*
                버튼 하나로 합쳤다. 가입은 로그인 화면 하단 링크에서 이어지므로 둘 다 같은 곳으로
                갔는데, 나란히 두면 다른 곳으로 가는 줄 읽힌다. 위 헤더도 같은 버튼 하나다.
              */}
              <Button asChild>
                <Link href={loginHref} onClick={() => setMobileOpen(false)}>
                  로그인/회원가입
                </Link>
              </Button>
            </>
          )}
        </div>
        </nav>
      </div>
    </header>
  );
}
