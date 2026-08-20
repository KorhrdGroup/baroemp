"use client";

import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { usePathname } from "next/navigation";
import { adminNavItems } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
        <Logo variant="mark" height={28} />
        <div>
          <p className="text-label-1 font-bold text-slate-900">한평생 오피스</p>
          <p className="text-label-2 text-slate-400">바로취업 Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-label-1 font-medium transition-colors",
                active
                  ? "bg-brand-blue-50 text-brand-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon className={cn("size-4", active ? "text-brand-blue-600" : "text-slate-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
