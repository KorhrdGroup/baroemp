"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { adminNavItems, adminTopNavItems } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/features/auth/auth-actions";

export interface AdminHeaderUser {
  name?: string;
  email?: string;
}

export function AdminHeader({ admin }: { admin?: AdminHeaderUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="메뉴 열기">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b border-slate-200 px-4 py-3">
              <SheetTitle className="text-left">한평생 오피스</SheetTitle>
            </SheetHeader>
            <nav className="space-y-1 p-3">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-label-1 text-slate-700 hover:bg-brand-blue-50"
                  >
                    <Icon className="size-4 text-slate-400" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

        <nav className="hidden items-center gap-1 md:flex">
          {adminTopNavItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-label-1 font-medium transition-colors",
                  active
                    ? "bg-brand-blue-50 text-brand-blue-600"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="검색">
          <Search className="size-4 text-slate-500" />
        </Button>
        <Button variant="ghost" size="icon" className="relative" aria-label="알림">
          <Bell className="size-4 text-slate-500" />
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            12
          </span>
        </Button>
        <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
          <span className="text-label-1 font-medium text-slate-700">{admin?.name || admin?.email || "관리자"}</span>
          <Link href="/" className="text-label-2 text-slate-400">
            사이트
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="text-label-2 text-slate-400 hover:text-red-500">
              로그아웃
            </button>
          </form>
        </div>
        <Button size="sm" className="bg-brand-blue-400 hover:bg-brand-blue-600">
          + 상담 배정
        </Button>
      </div>
    </header>
  );
}
