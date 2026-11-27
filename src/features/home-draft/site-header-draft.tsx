"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAuthPath } from "@/lib/auth/redirect";
import { ChevronRight, Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mainNavItems, siteConfig } from "@/lib/site-config";
import { Logo } from "@/components/layout/logo";
import { ScreenScaleControl } from "./screen-scale-control";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/features/auth/auth-actions";
import type { AppRole } from "@/types";

export interface SiteHeaderUser {
  name?: string;
  email?: string;
  role: AppRole;
}

/**
 * look="draft3": /draft3 머리글 (시안 D). 메뉴는 다른 머리글과 같이 지금 보는 메뉴 아래에 파랑 막대(머리글 아래 선에 붙음).
 * 검색은 동그란 단추 하나, 화면 크기는 "가" 세 글자로 줄여 같은 줄에 - 위 보조 줄을 없앤다. 단추는 남색 알약.
 * 다른 화면(/draft · /draft2 · 운영)은 look 을 주지 않아 그대로다. 휴대폰 모양은 둘 다 같다.
 */
export function SiteHeaderDraft({ user, look }: { user: SiteHeaderUser | null; look?: "draft3" }) {
  const d3 = look === "draft3";

  // 하위 경로(/jobs/job-001, /resume/new 등)에서도 해당 메뉴를 선택 상태로 둔다.
  const pathname = usePathname();
  /*
   * 로그인 화면에서는 내비 밑줄의 focus-within 만 끈다.
   * 보호 페이지 메뉴를 클릭해 로그인으로 튕기면 그 링크에 포커스가 남고,
   * 마우스를 치워도 밑줄이 계속 켜진 채라 엉뚱한 메뉴가 선택된 것처럼 보인다.
   */
  const onAuthScreen = isAuthPath(pathname);
  // 로그인 후 보던 화면으로 돌아오게 한다. 없으면 마이페이지로 떨어진다.
  const loginHref = onAuthScreen ? "/login" : `/login?next=${encodeURIComponent(pathname)}`;
  // 자기소개서 화면(/cover-letter/…)도 "이력서 첨삭" 메뉴에 속한다. 목록이 /resume 한 화면에 같이 있다.
  const isCurrentNav = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`) || (href === "/resume" && (pathname === "/cover-letter" || pathname.startsWith("/cover-letter/")));
  /*
   * 메뉴가 넷뿐이라 줄을 따로 쓰면 빈 줄이 된다. 로고 · 메뉴 · 검색 · 로그인을 한 줄에 모은다.
   * 일자리찾기 목록은 화면 안에 검색창이 이미 있어 둘이 되므로 뺀다.
   */
  const showHeaderSearch = !onAuthScreen && pathname !== "/jobs";
  /* 잡아바처럼 머리글에는 작은 검색 단추만 두고, 누르면 위에서 검색 판이 내려온다. */
  const [searchOpen, setSearchOpen] = useState(false);
  /* 휴대폰 메뉴 판. 아래 탭이 없는 화면(진단 · 온보딩 진행 중)에서도 다른 메뉴로 갈 길이 된다. */
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
    {/*
     * 고용24처럼 머리글 위에 얇은 보조 줄을 둔다. 스크롤하면 같이 올라가고 머리글만 붙어 남는다 -
     * 붙는 높이(64px)가 바뀌면 화면마다 맞춰 둔 scroll-mt 값이 어긋난다.
     * 이 보조 줄은 넓은 화면에만 둔다. /draft3 머리글은 좁은 화면에도 "가 가" 단추를 로고 줄에 둔다.
     */}
    <div className={cn("hidden border-b border-border/70 bg-gov-surface", !d3 && "lg:block")}>
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-end px-8">
        <ScreenScaleControl />
      </div>
    </div>
    {/*
      넓은 화면은 한 줄이 붙어 따라온다. 휴대폰은 로고 줄 아래 검색 줄까지 두 줄이라 붙이면 화면의
      1/6을 먹어 붙이지 않는다 - 메뉴는 아래 탭이 늘 붙어 있다.
    */}
    {/*
      화면 크기를 키워도(zoom) 미디어 쿼리는 창 폭 그대로라 넓은 화면용 한 줄 머리글이 좁아진 자리에 그대로 그려진다.
      창이 아주 넓지 않으면(1400px 미만) 메뉴와 단추가 오른쪽으로 넘쳐 잘리므로, 그 구간에서는 머리글만 확대를 되돌려 원래 크기로 둔다.
      휴대폰도 같다 - 로고와 로그인 단추가 한 줄에 빠듯해 키우면 넘친다. 덕분에 "가 가" 단추가 누른 자리에 그대로 있다.
    */}
    <header className="z-50 w-full border-b border-border/70 bg-white lg:sticky lg:top-0 max-[1399px]:[zoom:calc(1/var(--screen-scale,1))]">
      <div className={cn("mx-auto flex h-16 max-w-7xl items-center gap-6 px-4.5 lg:gap-4 lg:px-6 xl:gap-8 xl:px-8", d3 ? "lg:h-20" : "lg:h-[72px]")}>
        <Link href="/" aria-label={siteConfig.name} className="flex shrink-0 items-center">
          {/* 같은 그림 한 장이라 두 번 그려도 요청은 하나다. 좁은 화면에서는 한 단계 작게. */}
          <Logo height={18} priority className="lg:hidden" />
          <Logo height={d3 ? 22 : 20} priority className="hidden lg:block" />
        </Link>

        {/* 메뉴. 막대를 머리글 아래 선에 맞추려고 줄 높이만큼 늘린다. */}
        <nav aria-label="주 메뉴" className="hidden h-full items-center lg:flex">
          {mainNavItems.map((item) => {
            const current = isCurrentNav(item.href);
            return (
              <div key={item.href} className="group relative flex h-full items-center">
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "px-4 py-2 text-body-1 whitespace-nowrap lg:px-2.5 xl:px-5",
                    current ? cn("font-semibold", d3 ? "text-baro-blue" : "text-brand-blue-600") : "font-semibold text-slate-800",
                  )}
                >
                  {item.label}
                </Link>
                {/* 막대가 왼쪽에서 오른쪽으로 채워지도록 scaleX를 쓴다(width 애니메이션은 리플로우를 유발). */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-3 bottom-0 h-[3px] origin-left lg:inset-x-2 xl:inset-x-3 transition-transform duration-200 ease-out",
                    current ? (d3 ? "bg-baro-blue" : "bg-brand-blue-600") : "bg-slate-300 scale-x-0",
                    !current && !onAuthScreen && "group-focus-within:scale-x-100",
                  )}
                />
              </div>
            );
          })}
        </nav>

        {d3 ? (
          <div className="ml-auto hidden items-center gap-3 lg:flex">
            <ScreenScaleControl compact />
            {showHeaderSearch && (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-haspopup="dialog"
                aria-label="일자리 검색"
                title="일자리 검색"
                className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-baro-field text-slate-800"
              >
                <Search className="size-5" />
              </button>
            )}
          </div>
        ) : (
          showHeaderSearch && <SearchTrigger onOpen={() => setSearchOpen(true)} className="ml-auto hidden lg:flex" />
        )}

        {/*
          좁은 화면의 메뉴는 아래 탭(BottomTabBar)이 맡는다. 그래서 햄버거가 없고,
          로그인한 회원의 버튼들도 lg 부터만 보인다 - 좁은 화면에서는 아래 탭의 "마이"가 같은 곳이다.
        */}
        <div className={cn("ml-auto flex shrink-0 items-center gap-2", (showHeaderSearch || d3) && "lg:ml-0")}>
          {/*
            검색 단추가 없는 화면(일자리찾기)의 휴대폰은 아랫줄을 두지 않고 화면 크기 단추를 로고 줄로 올린다.
            로그인한 회원만 - 비회원은 이 줄에 로그인 단추가 있어 둘을 같이 두면 375px 화면을 11px 넘친다.
          */}
          {d3 && !showHeaderSearch && user && (
            <div className="lg:hidden">
              <ScreenScaleControl compact />
            </div>
          )}
          {user ? (
            <>
              {/* 관리자 화면은 머리글에 두지 않는다. 관리자는 /admin 주소로 바로 들어간다. */}
              <Button
                size="sm"
                className={cn("hidden lg:inline-flex", d3 ? "h-11 rounded-full bg-baro-navy px-5 text-body-2 font-semibold" : "bg-brand-blue-600")}
                asChild
              >
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
            <Button
              size="sm"
              className={cn(d3 ? "rounded-full bg-baro-navy lg:h-11 lg:px-5 lg:text-body-2 lg:font-semibold" : "bg-brand-blue-600")}
              asChild
            >
              <Link href={loginHref}>로그인/회원가입</Link>
            </Button>
          )}
          {/* 휴대폰 메뉴 단추. 넓은 화면은 위에 메뉴가 늘 보인다. */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-haspopup="dialog"
            aria-label="메뉴 열기"
            className="-mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-800 lg:hidden"
          >
            <Menu className="size-6" />
          </button>
        </div>
      </div>

      {/*
        휴대폰: 검색 단추를 로고 아래 한 줄로. 눌러도 같은 판이 내려온다.
        /draft3 는 그 옆에 화면 크기 단추를 둔다 - 로고 줄은 로그인 단추까지 있으면 자리가 없다.
        검색 단추가 없는 화면(로그인 · 일자리찾기): 회원은 이 줄 없이 화면 크기 단추를 로고 줄에 둔다 - 단추 하나만 오른쪽에 남아 왼쪽이 비어 보였다.
        비회원은 로고 줄에 로그인 단추가 있어 자리가 없으므로, 화면 크기 단추만 이 줄 오른쪽에 둔다.
      */}
      {(showHeaderSearch || (d3 && !user)) && (
        <div className="flex items-center justify-end gap-2 px-4.5 pb-3 lg:hidden">
          {showHeaderSearch && <SearchTrigger onOpen={() => setSearchOpen(true)} className="flex min-w-0 flex-1" />}
          {d3 && <ScreenScaleControl compact />}
        </div>
      )}

    </header>
    {showHeaderSearch && <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />}
    <MenuPanel open={menuOpen} onClose={() => setMenuOpen(false)} isCurrent={isCurrentNav} user={user} loginHref={loginHref} />
    </>
  );
}

/** 검색 판을 내리는 단추. 입력칸처럼 보이지만 누르면 판이 열린다. */
function SearchTrigger({ onOpen, className }: { onOpen: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className={cn(
        "h-11 cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white pr-2 pl-4 text-left lg:h-10 lg:w-56 xl:w-64",
        className,
      )}
    >
      <span className="min-w-0 flex-1 truncate text-body-2 text-slate-600">일자리 검색</span>
      <Search className="size-5 shrink-0 text-brand-blue-600" />
    </button>
  );
}

/** 판에 늘어놓는 검색어. 공고가 실제로 넉넉한 말만 둔다. */
const SUGGESTED_KEYWORDS = ["요양보호사", "사회복지사", "경비", "조리", "청소", "운전"];

/**
 * 위에서 내려오는 검색 판 (잡아바 통합검색과 같은 모양).
 * 판은 늘 그려 두고 위로 숨겨 둔다 - 열고 닫을 때 미끄러져 내려오고 올라가게 하려면
 * 숨김 상태에서도 자리에 있어야 한다. 닫힌 동안은 invisible 이라 키보드로도 들어가지 않는다.
 * /jobs 가 keyword 파라미터로 검색하므로 GET form 으로 그대로 넘긴다.
 */
function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // 판이 내려오기 시작한 뒤에 커서를 넣는다. 바로 넣으면 숨김 상태라 들어가지 않는다.
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div className={cn("fixed inset-0 z-[70]", open ? "visible" : "invisible delay-300")} aria-hidden={!open}>
      <button
        type="button"
        aria-label="검색 닫기"
        tabIndex={-1}
        onClick={onClose}
        className={cn(
          "absolute inset-0 cursor-default bg-slate-900/40 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="일자리 검색"
        className={cn(
          "absolute inset-x-0 top-0 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)] transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "-translate-y-full",
        )}
      >
        <div className="mx-auto max-w-5xl px-4.5 pt-5 pb-6 lg:px-8 lg:pt-7 lg:pb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-title-3 font-bold text-slate-900">일자리 검색</h2>
            <button
              type="button"
              aria-label="검색 닫기"
              onClick={onClose}
              className="-mr-2 rounded-lg p-2 text-slate-500"
            >
              <X className="size-6" />
            </button>
          </div>

          <form
            action="/jobs"
            role="search"
            onSubmit={onClose}
            className="mt-4 flex h-14 items-center rounded-xl border-2 border-brand-blue-600 bg-white pr-2 pl-5"
          >
            <input
              ref={inputRef}
              type="text"
              name="keyword"
              placeholder="예: 요양보호사, 경비, 조리"
              aria-label="검색어"
              className="h-full w-full min-w-0 bg-transparent text-body-1 text-slate-900 placeholder:text-slate-600 focus:outline-none"
            />
            <button
              type="submit"
              className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-brand-blue-600 px-5 text-body-2 font-semibold text-white"
            >
              <Search className="size-4" />
              검색
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-body-3 font-semibold text-slate-700">많이 찾는 일</span>
            {SUGGESTED_KEYWORDS.map((keyword) => (
              <Link
                key={keyword}
                href={`/jobs?keyword=${encodeURIComponent(keyword)}`}
                onClick={onClose}
                className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-body-3 font-medium text-slate-700"
              >
                {keyword}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 휴대폰 메뉴 판. 검색 판과 같이 위에서 내려온다.
 * 아래 탭과 같은 메뉴에 직업진단을 더해 한곳에 모은다. 회원에게는 마이페이지 · 로그아웃, 비회원에게는 로그인.
 */
function MenuPanel({
  open,
  onClose,
  isCurrent,
  user,
  loginHref,
}: {
  open: boolean;
  onClose: () => void;
  isCurrent: (href: string) => boolean;
  user: SiteHeaderUser | null;
  loginHref: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 넓은 화면 메뉴는 자리가 좁아 "이력서 첨삭"으로 줄였지만, 이 판은 자리가 넉넉해 푸터와 같은 온전한 이름을 쓴다.
  const items = [...mainNavItems.map((item) => (item.href === "/resume" ? { ...item, label: "이력서·자소서 첨삭" } : item)), user ? { href: "/mypage", label: "마이페이지" } : { href: loginHref, label: "로그인/회원가입" }];

  return (
    <div className={cn("fixed inset-0 z-[70] lg:hidden", open ? "visible" : "invisible delay-300")} aria-hidden={!open}>
      <button
        type="button"
        aria-label="메뉴 닫기"
        tabIndex={-1}
        onClick={onClose}
        className={cn(
          "absolute inset-0 cursor-default bg-slate-900/40 transition-opacity duration-300 motion-reduce:transition-none",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="메뉴"
        className={cn(
          "absolute inset-x-0 top-0 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)] transition-transform duration-300 ease-out motion-reduce:transition-none",
          open ? "translate-y-0" : "-translate-y-full",
        )}
      >
        <div className="px-4.5 pt-3 pb-5">
          <div className="flex h-11 items-center justify-between">
            <h2 className="text-title-3 font-bold text-slate-900">메뉴</h2>
            <button type="button" aria-label="메뉴 닫기" onClick={onClose} className="-mr-2 flex size-11 items-center justify-center rounded-lg text-slate-600">
              <X className="size-6" />
            </button>
          </div>
          <nav aria-label="주 메뉴" className="mt-2">
            <ul className="divide-y divide-slate-100">
              {items.map((item) => {
                const current = isCurrent(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex h-14 items-center justify-between text-body-1 font-semibold",
                        current ? "text-baro-blue-600" : "text-slate-900",
                      )}
                    >
                      {item.label}
                      <ChevronRight aria-hidden className="size-5 text-slate-400" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {user && (
            <form action={signOutAction} className="mt-3 border-t border-slate-100 pt-3">
              <button type="submit" className="flex h-12 w-full cursor-pointer items-center text-body-2 font-medium text-slate-600">
                로그아웃
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
