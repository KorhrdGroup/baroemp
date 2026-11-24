"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Coins, FileEdit, Home, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 좁은 화면의 아래 탭. 앱으로 옮겼을 때의 탭 구성을 웹에서 먼저 맞춰 둔다.
 * 넓은 화면은 위쪽 메뉴가 같은 일을 하므로 띄우지 않는다 - PC 에서까지 아래 탭이 보이면
 * 휴대폰 화면을 옮겨 놓은 것처럼 읽힌다.
 */
const TABS = [
  { label: "홈", href: "/draft", icon: Home },
  { label: "일자리", href: "/jobs", icon: Briefcase },
  { label: "지원금", href: "/support", icon: Coins },
  { label: "이력서", href: "/resume", icon: FileEdit },
  { label: "마이", href: "/mypage", icon: User },
];

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-xl">
        {TABS.map(({ label, href, icon: Icon }) => {
          const current = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-caption-1",
                  current ? "font-bold text-brand-blue-600" : "font-medium text-slate-600",
                )}
              >
                <Icon className="size-6" strokeWidth={current ? 2.2 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
