"use client";

import Link from "next/link";
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label={siteConfig.name} className="flex items-center">
            <Logo height={20} priority />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-body-2 font-medium text-slate-700 transition-colors hover:bg-brand-blue-50 hover:text-brand-blue-600",
                )}
              >
                {item.label}
              </Link>
            ))}
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
              <Button variant="ghost" className="hidden text-slate-700 sm:inline-flex" asChild>
                <Link href="/mypage">마이페이지</Link>
              </Button>
              <form action={signOutAction} className="hidden sm:inline-flex">
                <Button type="submit" variant="ghost" className="text-slate-700">
                  로그아웃
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button variant="ghost" className="hidden text-slate-700 sm:inline-flex" asChild>
                <Link href="/login">로그인</Link>
              </Button>
              <Button className="hidden bg-brand-blue-400 hover:bg-brand-blue-600 sm:inline-flex" asChild>
                <Link href="/signup">회원가입</Link>
              </Button>
            </>
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
                {mainNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-3 text-body-2 font-medium text-slate-700 hover:bg-brand-blue-50"
                  >
                    {item.label}
                  </Link>
                ))}
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
