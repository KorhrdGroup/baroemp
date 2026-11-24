import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * 첫 줄 가운데의 소식 카드 두 장. 잡아바처럼 검색 판 옆에 "지금 눈여겨볼 것"을 세운다.
 * 넘어가는 배너는 두지 않는다 - 중장년 이용자는 저절로 바뀌는 화면을 놓치기 쉽다.
 */
const CARDS = [
  {
    label: "지원금",
    title: "내일배움카드 최대 500만원",
    href: "/support",
  },
  {
    label: "상담",
    title: "1:1 취업컨설팅",
    href: "/consulting",
  },
];

export function HeroSideCards() {
  return (
    <div className="grid h-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-1">
      {CARDS.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="group flex items-center justify-between gap-2 rounded-2xl border border-border bg-white p-4 transition-colors hover:border-slate-300 sm:p-6"
        >
          <span className="min-w-0">
            <span className="text-label-1 text-slate-600 sm:text-body-2">{card.label}</span>
            <span className="mt-1 block text-body-1 font-semibold break-keep text-slate-900 sm:text-title-3">
              {card.title}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-slate-400 group-hover:text-slate-700" />
        </Link>
      ))}
    </div>
  );
}
