import Link from "next/link";
import { coreServices } from "@/features/home/core-services.data";
import { ServiceIcon } from "./service-icons";

/**
 * 빠른 메뉴 네 칸. 잡아바의 빠른 메뉴처럼 이름 하나와 오른쪽 둥근 아이콘만 둔다(설명 글은 뺐다).
 * 카드 전체가 링크라 누를 자리가 크다 - 앱으로 옮겨도 그대로 한 칸짜리 버튼이 된다.
 */
export function CoreServicesSection() {
  return (
    <nav aria-label="빠른 메뉴" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {coreServices.map((service) => (
        <Link
          key={service.id}
          href={service.href}
          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 transition-colors hover:border-slate-300 sm:px-6 sm:py-5"
        >
          <span className="min-w-0 text-body-1 font-semibold break-keep text-slate-900 sm:text-title-3">
            {service.title}
          </span>
          <span className="hidden size-16 shrink-0 items-center justify-center rounded-full bg-slate-50 sm:flex">
            <ServiceIcon id={service.id} />
          </span>
        </Link>
      ))}
    </nav>
  );
}
