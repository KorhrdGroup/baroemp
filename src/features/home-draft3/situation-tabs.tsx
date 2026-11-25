"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlarmClock,
  ChevronRight,
  FilePen,
  FileText,
  HandCoins,
  ListChecks,
  PenLine,
  Sprout,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/*
  /draft3 상황별 서비스. 공공 일자리 누리집의 "지금 나에게 필요한 서비스" 짜임을 따랐다:
  회색 띠 위에 제목(왼쪽) + 상황 알약(오른쪽), 아래에 고른 상황의 흰 카드(그림 · 제목 · 설명 · 갈 곳).
  "1:1 취업컨설팅"은 바로 아래 상담 구역과 겹쳐 뺐다.
  그림도 같은 누리집처럼 바탕 원 없는 가는 선 그림 한 색(파랑) - 면을 채운 그림보다 카드가 가볍고 글이 먼저 읽힌다.
*/
const SITUATIONS: {
  key: string;
  label: string;
  cards: { icon: LucideIcon; title: string; desc: string; cta: string; href: string }[];
}[] = [
  {
    key: "new",
    label: "새로운 일을 찾아요",
    cards: [
      { icon: ListChecks, title: "내게 맞는 직업 찾기", desc: "경력과 성향에 맞는 직업 추천", cta: "직업진단", href: "/assessment" },
      { icon: Sprout, title: "경력 없어도 되는 일자리", desc: "처음이어도 괜찮은 공고 모음", cta: "공고 보기", href: "/jobs?beginner=1" },
      { icon: HandCoins, title: "직업훈련 지원금", desc: "배우는 동안 받는 훈련 지원금", cta: "지원금 찾기", href: "/support" },
    ],
  },
  {
    key: "return",
    label: "다시 일하고 싶어요",
    cards: [
      { icon: AlarmClock, title: "곧 마감되는 공고", desc: "일주일 안에 마감되는 공고", cta: "공고 보기", href: "/jobs?closingSoon=1" },
      { icon: FileText, title: "이력서 다시 쓰기", desc: "쉬었던 기간도 자연스럽게", cta: "이력서 쓰기", href: "/resume" },
      { icon: HandCoins, title: "받을 수 있는 지원금", desc: "다시 일할 때 받는 지원 제도", cta: "지원금 찾기", href: "/support" },
    ],
  },
  {
    key: "working",
    label: "지금 일하고 있어요",
    cards: [
      { icon: TrendingUp, title: "급여 높은 공고", desc: "더 나은 조건을 급여순으로", cta: "공고 보기", href: "/jobs?sort=salary_desc" },
      { icon: FilePen, title: "이력서 첨삭", desc: "경력이 잘 드러나게 다듬기", cta: "첨삭 받기", href: "/resume" },
      { icon: PenLine, title: "자기소개서 첨삭", desc: "경험을 골라 문항별로 빠르게", cta: "자기소개서 쓰기", href: "/cover-letter" },
    ],
  },
];

/** 카드가 차례로 떠오르는 간격(ms). 제목 → 첫 카드 → 둘째 … 순. */
const STAGGER_MS = 90;

export function SituationTabs() {
  const [activeKey, setActiveKey] = useState(SITUATIONS[0].key);
  // 처음 그릴 때는 카드 등장 애니메이션을 돌리지 않는다(스크롤 등장과 겹치지 않게). 알약을 누른 뒤부터만.
  const [switched, setSwitched] = useState(false);
  const active = SITUATIONS.find((s) => s.key === activeKey) ?? SITUATIONS[0];
  const rootRef = useRef<HTMLDivElement>(null);

  /*
    구역이 처음 화면에 들어올 때 제목 → 카드가 차례로 아래에서 떠오른다(한 번만).
    처음부터 보이는 위치거나 움직임 줄이기면 건드리지 않는다. 숨김은 data-reveal 로만 걸어 스크립트가 없어도 내용은 보인다.
    위치로 판단해 End 키 등으로 건너뛴 경우에도 보이게 된다.
  */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    el.dataset.reveal = "hidden";
    const check = () => {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.85) return;
      el.dataset.reveal = "shown";
      window.removeEventListener("scroll", check);
    };
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  function select(key: string) {
    if (key === activeKey) return;
    setActiveKey(key);
    setSwitched(true);
  }

  const rise =
    "transition-[opacity,translate] duration-500 ease-out group-data-[reveal=hidden]:translate-y-6 group-data-[reveal=hidden]:opacity-0";

  return (
    <div ref={rootRef} className="group">
      <div className={cn("flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between", rise)}>
        <div>
          <p className="text-body-3 font-semibold text-slate-600">상황별 서비스</p>
          <h2 className="mt-1.5 text-title-3 font-bold tracking-[-0.02em] break-keep text-slate-900 sm:text-title-2">
            지금 내 상황에 맞는 서비스
          </h2>
        </div>
        <div role="tablist" aria-label="내 상황" className="scrollbar-hidden -mx-4.5 flex gap-2 overflow-x-auto px-4.5 sm:mx-0 sm:px-0">
          {SITUATIONS.map((s) => {
            const selected = s.key === active.key;
            return (
              <button
                key={s.key}
                id={`situation-tab-${s.key}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="situation-panel"
                onClick={() => select(s.key)}
                className={cn(
                  "inline-flex h-11 shrink-0 items-center rounded-full px-5 text-body-2 whitespace-nowrap transition-colors duration-300 ease-out sm:text-body-1",
                  selected ? "bg-atomic-blue-900 font-bold text-white" : "bg-white font-semibold text-slate-700",
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <ul
        key={active.key}
        id="situation-panel"
        role="tabpanel"
        aria-labelledby={`situation-tab-${active.key}`}
        className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        {active.cards.map((c, i) => (
          <li
            key={c.title}
            className={cn(rise, switched && "motion-safe:animate-[situation-in_400ms_ease-out_backwards]")}
            style={{ transitionDelay: `${(i + 1) * STAGGER_MS}ms`, animationDelay: `${i * 60}ms` }}
          >
            <Link href={c.href} className="flex h-full items-center gap-5 rounded-[20px] bg-white p-6 transition-shadow duration-200 hover:shadow-[0_0_10px_rgba(0,24,77,0.12)] sm:gap-7 sm:p-8">
              <c.icon aria-hidden strokeWidth={1.5} className="size-10 shrink-0 text-atomic-blue-600 sm:size-11" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body-1 font-bold break-keep text-slate-900 sm:text-title-3">{c.title}</span>
                <span className="mt-1.5 text-body-3 font-medium text-balance break-keep text-slate-600 sm:text-body-2">{c.desc}</span>
                <span className="mt-auto inline-flex items-center gap-0.5 pt-4 text-body-2 font-bold text-slate-600">
                  {c.cta}
                  <ChevronRight className="size-4" aria-hidden />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
