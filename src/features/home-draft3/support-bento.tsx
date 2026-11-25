import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ServiceIcon } from "@/features/home-draft/service-icons";
import { SUPPORT_HIGHLIGHTS } from "@/features/home-draft/support-highlights-data";
import { resolveOrganizationLogo } from "@/lib/support/organization-logo";

/* 큰 카드로 세울 제도. 가장 많이 찾고 금액이 눈에 띄는 것. */
const LEAD_ID = "support-002";

/**
 * /draft3 지원금 구역. 한 구역 안에서 카드와 목록을 섞는다(벤토) -
 * 왼쪽 큰 카드 한 장에 대표 제도를 크게, 오른쪽에 나머지를 얇은 선 목록으로.
 * /draft 는 카드 여섯 장, /draft2 는 표 한 장이라 이 둘의 가운데.
 * 파랑은 대표 금액 하나에만 - 목록 금액까지 파랗게 하면 화면이 파랑으로 덮인다. 큰 카드 바탕도 회색으로.
 */
export function SupportBento() {
  const lead = SUPPORT_HIGHLIGHTS.find((s) => s.id === LEAD_ID) ?? SUPPORT_HIGHLIGHTS[0];
  const rest = SUPPORT_HIGHLIGHTS.filter((s) => s.id !== lead.id);
  const leadLogo = resolveOrganizationLogo(lead.org);

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
      <Link
        href="/support"
        className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-xl bg-gov-surface p-6 sm:p-8 lg:col-span-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {leadLogo ? (
              <Image src={leadLogo} alt={lead.org} width={96} height={24} className="h-6 w-auto" />
            ) : (
              <p className="text-body-3 font-semibold text-slate-700">{lead.org}</p>
            )}
            <p className="mt-4 text-title-2 font-extrabold tracking-[-0.02em] text-slate-900">{lead.title}</p>
            <p className="mt-2 text-body-2 font-medium break-keep text-slate-700">{lead.summary}</p>
          </div>
          <span aria-hidden className="hidden shrink-0 rounded-full bg-white p-4 sm:block [&>svg]:size-12">
            <ServiceIcon id="support" />
          </span>
        </div>
        <p className="text-headline-3 font-extrabold tracking-[-0.02em] text-atomic-blue-600">{lead.amount}</p>
        {/* 오른쪽 목록 다섯 줄과 높이를 맞추느라 생기는 가운데 빈자리를, 금액과 신청 정보 한 줄로 나눠 채운다. */}
        <div className="flex items-end justify-between gap-4 border-t border-slate-200 pt-5">
          <dl className="flex gap-6 text-body-3">
            <div>
              <dt className="font-medium text-slate-600">신청 기간</dt>
              <dd className="mt-0.5 font-semibold text-slate-800">{lead.period}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-600">지역</dt>
              <dd className="mt-0.5 font-semibold text-slate-800">{lead.region}</dd>
            </div>
          </dl>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-body-2 font-semibold text-slate-800">
            자세히
            <ChevronRight className="size-4" aria-hidden />
          </span>
        </div>
      </Link>

      <ul className="divide-y divide-border border-y border-slate-300 lg:col-span-7 lg:ml-4">
        {rest.map((item) => (
          <li key={item.id}>
            <Link href="/support" className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="truncate text-body-1 font-semibold text-slate-800">{item.title}</p>
                <p className="mt-1 text-body-3 font-medium text-slate-600">
                  {item.org} · {item.region}
                </p>
              </div>
              <p className="shrink-0 text-body-1 font-bold text-slate-900">{item.amount}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
