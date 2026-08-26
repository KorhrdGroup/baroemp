"use client";

import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/common/section-heading";
import { cardShadowClass, cardBorderClass } from "@/lib/ui-classes";

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
    org: "여성가족부",
    amount: "교육비 전액",
    summary: "경력단절 여성 직업교육·취업연계 통합 지원",
    period: "상시",
    region: "전국",
  },
  {
    id: "support-005",
    title: "중장년 일자리희망센터",
    org: "서울시",
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
  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl bg-white p-6",
        cardBorderClass,
        cardShadowClass,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="rounded-full text-label-2 text-slate-500">
          {item.org}
        </Badge>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-label-2 font-bold text-emerald-700">
          신청가능
        </span>
      </div>

      <h3 className="mt-4 text-body-1 font-bold text-slate-900">{item.title}</h3>

      <p className="mt-3 text-title-2 font-extrabold tracking-tight text-brand-blue-600">
        {item.amount}
      </p>

      <p className="mt-2 text-label-1 text-slate-500">{item.summary}</p>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-4 text-label-2 text-slate-400">
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
  const doubled = [...highlights, ...highlights];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="지금 신청 가능한 지원금"
          description="중장년 취업을 위해 정부·지자체에서 운영 중인 주요 지원 제도입니다."
          align="center"
          action={
            <Link
              href="/support"
              className="flex items-center gap-1 text-label-1 font-semibold text-brand-blue-600 hover:underline"
            >
              전체 지원금 보기
              <ArrowRight className="size-4" />
            </Link>
          }
        />
      </div>

      <div className="group/marquee relative mt-8 overflow-hidden">
        <div className="flex w-max animate-[marquee_40s_linear_infinite] gap-4 group-hover/marquee:[animation-play-state:paused]">
          {doubled.map((item, i) => (
            <SupportCard key={`${item.id}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
