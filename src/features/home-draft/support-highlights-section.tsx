"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { resolveOrganizationLogo } from "@/lib/support/organization-logo";
import { SUPPORT_HIGHLIGHTS } from "./support-highlights-data";

const highlights = SUPPORT_HIGHLIGHTS;

function SupportCard({ item }: { item: (typeof highlights)[number] }) {
  const logo = resolveOrganizationLogo(item.org);
  return (
    // 시안은 페이지 바탕이 회색이라 타일은 흰 면에 가는 테두리로 띄운다.
    <div className="flex flex-col rounded-xl border border-border bg-white p-6">
      <div className="flex items-center justify-between gap-2">
        {logo ? (
          <Image src={logo} alt={item.org} width={80} height={24} className="h-5 w-auto" />
        ) : (
          <Badge variant="outline" className="rounded-full text-caption-1 text-slate-600">
            {item.org}
          </Badge>
        )}
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-caption-1 font-semibold text-emerald-700">
          신청가능
        </span>
      </div>

      <h3 className="mt-4 text-body-1 font-semibold text-slate-900">{item.title}</h3>

      <p className="mt-2 text-title-3 font-bold tracking-tight text-slate-900">
        {item.amount}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-caption-1 text-slate-600">
        <span className="flex items-center gap-1">
          {/* 핀은 폭이 좁아 같은 크기면 시계보다 작아 보인다. 한 단계 키우고 선은 둘 다 같은 px 로 고정한다. */}
          <MapPin className="size-3.5" absoluteStrokeWidth strokeWidth={1.25} />
          {item.region}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" absoluteStrokeWidth strokeWidth={1.25} />
          {item.period}
        </span>
      </div>
    </div>
  );
}

export function SupportHighlightsSection() {
  return (
    <section className="mx-auto mt-12 max-w-7xl px-4.5 sm:mt-16 lg:px-8">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-title-3 font-bold tracking-tight text-slate-900 sm:text-title-1">지금 신청할 수 있는 지원금</h2>
        <Link
          href="/support"
          className="inline-flex shrink-0 items-center gap-0.5 text-body-2 font-semibold text-slate-700"
        >
          더보기
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {highlights.map((item) => (
          <SupportCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
