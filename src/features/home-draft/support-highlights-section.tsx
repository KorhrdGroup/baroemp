"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { resolveOrganizationLogo } from "@/lib/support/organization-logo";

/*
  홈에 세워 두는 대표 지원제도. 로고는 기관명으로 찾는다(중앙부처만 있고, 지자체는 글자로 떨어진다).
  경로를 여기에 또 적어두면 파일 이름이 바뀔 때 이 화면만 깨진다.
*/
const highlights = [
  {
    id: "support-001",
    title: "중장년 취업성공패키지",
    org: "고용노동부",
    amount: "최대 195만원",
    summary: "구직활동부터 취업 성공까지 단계별 지원금 지급",
    period: "상시",
    region: "전국",
  },
  {
    id: "support-002",
    title: "국민내일배움카드",
    org: "고용노동부",
    amount: "최대 500만원",
    summary: "직업훈련 수강료의 45~85% 지원 바우처",
    period: "상시",
    region: "전국",
  },
  {
    id: "support-003",
    title: "고령자 계속고용장려금",
    org: "고용노동부",
    amount: "최대 720만원/년",
    summary: "만 60세 이상 고용 시 사업주 인건비 지원",
    period: "상시",
    region: "전국",
  },
  {
    id: "support-004",
    title: "여성 새로일하기센터",
    org: "성평등가족부",
    amount: "교육비 전액",
    summary: "경력단절 여성 직업교육·취업연계 통합 지원",
    period: "상시",
    region: "전국",
  },
  {
    id: "support-005",
    title: "중장년 일자리희망센터",
    org: "서울특별시",
    amount: "무료 상담",
    summary: "생애경력설계 상담, 재취업 프로그램 무료 제공",
    period: "상시",
    region: "서울",
  },
  {
    id: "support-006",
    title: "장기미취업자 채용장려금",
    org: "고용노동부",
    amount: "최대 1,200만원",
    summary: "6개월 이상 미취업 구직자 정규직 채용 시 지원",
    period: "~2026.12",
    region: "전국",
  },
];

function SupportCard({ item }: { item: (typeof highlights)[number] }) {
  const logo = resolveOrganizationLogo(item.org);
  return (
    // 시안은 페이지 바탕이 회색이라 타일은 흰 면에 가는 테두리로 띄운다.
    <div className="flex flex-col rounded-xl border border-border bg-white p-6">
      <div className="flex items-center justify-between gap-2">
        {logo ? (
          <Image src={logo} alt={item.org} width={80} height={24} className="h-5 w-auto" />
        ) : (
          <Badge variant="outline" className="rounded-full text-label-2 text-slate-500">
            {item.org}
          </Badge>
        )}
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-label-2 font-semibold text-emerald-700">
          신청가능
        </span>
      </div>

      <h3 className="mt-4 text-body-1 font-semibold text-slate-900">{item.title}</h3>

      <p className="mt-2 text-title-3 font-bold tracking-tight text-slate-900">
        {item.amount}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-label-2 text-slate-400">
        <span className="flex items-center gap-1">
          <MapPin className="size-3" />
          {item.region}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
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
          className="inline-flex shrink-0 items-center gap-0.5 text-body-2 font-semibold text-slate-700 hover:text-slate-900"
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
