"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  const isCurrentNav = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
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
                        : "bg-brand-blue-300 scale-x-0 group-hover:scale-x-100 group-focus-within:scale-x-100",
                    )}
                  />
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="검색"
            className="hidden text-slate-600 sm:inline-flex"
          >
            <Search className="size-5" />
          </Button>

          {user ? (
            <>
              {isAdmin && (
                <Button variant="ghost" className="hidden text-slate-700 sm:inline-flex" asChild>
                  <Link href="/admin">관리자</Link>
                </Button>
              )}
              {/* 로그인 상태의 주 동작. 비로그인일 때 회원가입이 맡던 자리를 그대로 잇는다. */}
              <Button className="hidden bg-brand-blue-400 hover:bg-brand-blue-600 sm:inline-flex" asChild>
                <Link href="/mypage">마이페이지</Link>
              </Button>
              <form action={signOutAction} className="hidden sm:inline-flex">
                <Button type="submit" variant="ghost" className="text-slate-700">
                  로그아웃
                </Button>
              </form>
            </>
          ) : (
            /* 버튼 하나로 합쳤다. 회원가입은 로그인 화면 하단 링크로 이어진다. */
            <Button className="hidden bg-brand-blue-400 hover:bg-brand-blue-600 sm:inline-flex" asChild>
              <Link href="/login">로그인/회원가입</Link>
            </Button>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="메뉴 열기">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>{siteConfig.name}</SheetTitle>
              </SheetHeader>
              <nav className="mt-2 flex flex-col gap-1 px-4">
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
                      <Button variant="outline" asChild>
                        <Link href="/mypage" onClick={() => setMobileOpen(false)}>
                          마이페이지
                        </Link>
                      </Button>
                      <form action={signOutAction}>
                        <Button type="submit" className="w-full bg-brand-blue-400 hover:bg-brand-blue-600">
                          로그아웃
                        </Button>
                      </form>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" asChild>
                        <Link href="/login" onClick={() => setMobileOpen(false)}>
                          로그인
                        </Link>
                      </Button>
                      <Button className="bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
                        <Link href="/signup" onClick={() => setMobileOpen(false)}>
                          회원가입
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
