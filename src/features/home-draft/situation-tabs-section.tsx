"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ServiceIcon } from "./service-icons";
import { cn } from "@/lib/utils";

/**
 * "지금 나에게 필요한 서비스". 잡아바의 대상별 탭(취업준비생·재직자·중장년)을
 * 중장년의 상황으로 바꿨다. 서비스 이름 대신 "지금 내 처지"를 고르면 갈 곳 네 개가 나온다.
 */
interface ServiceCard {
  title: string;
  href: string;
  /** service-icons 의 채운 그림 이름. */
  icon: string;
}

const CONSULTING: ServiceCard = {
  title: "1:1 취업컨설팅",
  href: "/consulting",
  icon: "consulting",
};

const TABS: { id: string; label: string; emoji: string; cards: ServiceCard[] }[] = [
  {
    id: "new",
    label: "새로운 일을 찾아요",
    emoji: "🔍",
    cards: [
      {
        title: "내게 맞는 직업 찾기",
        href: "/assessment",
        icon: "assessment",
      },
      {
        title: "경력 없어도 되는 일자리",
        href: "/jobs?beginner=1",
        icon: "beginner",
      },
      {
        title: "직업훈련 지원금",
        href: "/support",
        icon: "support",
      },
      CONSULTING,
    ],
  },
  {
    id: "return",
    label: "다시 일하고 싶어요",
    emoji: "🌱",
    cards: [
      {
        title: "곧 마감되는 공고",
        href: "/jobs?closingSoon=1",
        icon: "closing",
      },
      {
        title: "이력서 다시 쓰기",
        href: "/resume",
        icon: "resume",
      },
      {
        title: "받을 수 있는 지원금",
        href: "/support",
        icon: "support",
      },
      CONSULTING,
    ],
  },
  {
    id: "working",
    label: "지금 일하고 있어요",
    emoji: "💼",
    cards: [
      {
        title: "급여 높은 공고",
        href: "/jobs?sort=salary_desc",
        icon: "salary",
      },
      {
        title: "이력서 첨삭",
        href: "/resume",
        icon: "resume",
      },
      {
        title: "자기소개서 첨삭",
        href: "/cover-letter",
        icon: "coverLetter",
      },
      CONSULTING,
    ],
  },
];

export function SituationTabsSection() {
  const [activeId, setActiveId] = useState(TABS[0].id);
  const active = TABS.find((tab) => tab.id === activeId) ?? TABS[0];

  return (
    <section className="mt-12 border-y border-border bg-white py-10 sm:mt-16 sm:py-14">
      <div className="mx-auto max-w-7xl px-4.5 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-title-3 font-bold tracking-tight text-slate-900 sm:text-title-1">상황별 서비스</h2>
          {/* 휴대폰에서는 가로로 밀어 고른다. 글자가 커도 줄바꿈되지 않게. */}
          <div role="tablist" aria-label="내 상황" className="-mx-4.5 flex gap-2 overflow-x-auto px-4.5 lg:mx-0 lg:px-0">
            {TABS.map((tab) => {
              const selected = tab.id === active.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`situation-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls="situation-panel"
                  onClick={() => setActiveId(tab.id)}
                  className={cn(
                    // 흰 알약에 테두리 색으로 가른다 (공고 판 탭과 같은 모양).
                    "flex shrink-0 items-center gap-1.5 rounded-full border bg-white px-4 py-2.5 text-body-2 whitespace-nowrap sm:text-body-1",
                    selected
                      ? "border-brand-blue-600 font-semibold text-brand-blue-600"
                      : "border-slate-300 font-medium text-slate-700",
                  )}
                >
                  <span aria-hidden>{tab.emoji}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          id="situation-panel"
          role="tabpanel"
          aria-labelledby={`situation-tab-${active.id}`}
          className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        >
          {active.cards.map((card) => {
            return (
              <Link
                key={card.title}
                href={card.href}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 sm:p-6"
              >
                <ServiceIcon id={card.icon} />
                <span className="flex items-end justify-between gap-2">
                  <span className="text-body-1 font-semibold break-keep text-slate-900 sm:text-title-3">{card.title}</span>
                  <ChevronRight className="mb-0.5 size-5 shrink-0 text-slate-500" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
