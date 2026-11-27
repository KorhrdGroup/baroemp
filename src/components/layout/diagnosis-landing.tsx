import Link from "next/link";
import { Check, ChevronRight, type LucideIcon } from "lucide-react";
import { Reveal } from "@/features/home-draft3/reveal";
import { LandingItemIcon } from "./landing-item-icons";
import type { Crumb } from "./page-head";
import { FirstQuestionCard } from "./first-question-card";
import { PlayWhenSeen } from "./play-when-seen";

/*
  진단으로 시작하는 서비스(직업진단 · 지원금 찾기)의 첫 화면.
  다른 세부 화면은 "위치 줄 + 제목" 머리 아래 바로 내용이지만, 여기는 처음 온 사람이 무엇을 얻는지 보고
  시작 단추를 누르게 하는 곳이라 소개 화면처럼 짠다:
  목적은 정보를 다 보여 주는 게 아니라 진단을 시작하게 하는 것. 그래서 위계는 약속 → 얻는 것 → 쉬움 → 맛보기 → 다시 시작:
  ① 첫 칸(옅은 하늘색 한 면) - 왼쪽 큰 제목 · 설명 두 줄(게시 수를 그 안에) · 시작 단추, 오른쪽 분야 탭 + 모음 카드 줄
     (모음 데이터가 없으면 결과 예시 카드)
  ②~③은 왼쪽 제목 칸 + 오른쪽 내용 칸(첫 칸과 같은 짜임):
  ② 알 수 있는 것 - 회색 바탕에 흰 원 그림 + 글(진단하면 받는 것)
  ③ 이렇게 진행돼요 - 흰 띠, 단계를 세로로 쌓은 카드(부담 덜기)
  ④ 마무리 - 옅은 하늘 판에 시작 단추 한 번 더 + 첫 질문 카드(판 아래로 걸쳐 잘림), 그 아래 안내 글
  무게: 굵기 800은 제목에만, 칸 제목은 700, 나머지는 500~600. 진한 파랑은 시작 단추와 핵심 숫자에만 -
  번호 · 표시까지 진하게 칠하면 화면이 무겁고 투박해진다. 모서리는 /draft3과 같게 카드 20px(rounded-card), 단추 12px, 표시는 알약.
  그림은 홈 서비스 그림처럼 면을 채운 두 톤(진한 파랑 + 옅은 파랑 + 노랑 한 점)으로 맞춘다.
*/

export interface LandingStep {
  title: string;
  desc: string;
  /** 단계 동그라미 안 선 아이콘(Lucide). */
  icon?: LucideIcon;
}

export interface LandingItem {
  /** landing-item-icons 의 그림 id. */
  icon: string;
  title: string;
  desc: string;
}

/* /draft3 색 판(.draft3-theme) 안에서는 첫머리를 옅은 하늘색 한 면으로. 진행 순서는 선으로 이은 번호 원, 알 수 있는 것은 회색 판 + 흰 원 그림. */
export function DiagnosisLanding({
  crumbs,
  badges,
  title,
  description,
  actions,
  preview,
  steps,
  itemsTitle,
  itemsDescription,
  items,
  stepsDescription,
  note,
  closingTitle,
  closingLead,
  closingQuestion,
}: {
  crumbs: Crumb[];
  /** 단추 아래 조용한 안내 한 줄(예: "무료", "약 3~5분"). */
  badges: string[];
  title: React.ReactNode;
  description: React.ReactNode;
  /** 시작 단추들. */
  actions: React.ReactNode;
  /** 오른쪽 칸. 모음 데이터가 있으면 분야 탭 + 카드 줄(DiagnosisShowcase), 없으면 결과 예시 카드. */
  preview: React.ReactNode;
  steps: LandingStep[];
  itemsTitle: React.ReactNode;
  /** 알 수 있는 것 제목 아래 설명 한 줄. */
  itemsDescription: React.ReactNode;
  items: LandingItem[];
  /** 진행 순서 제목 아래 설명 한 줄(예: 걸리는 시간). */
  stepsDescription: React.ReactNode;
  note: React.ReactNode;
  /** 맨 끝 시작 단추 판의 제목. 정보를 본 뒤 "내게 맞는 것은 진단으로"를 한 번 더 건넨다. */
  closingTitle: React.ReactNode;
  /** 마무리 제목 아래 한 줄(예: "어렵지 않아요. 해 온 일부터 고르면 돼요."). */
  closingLead: string;
  /** 마무리 판 오른쪽 첫 질문 카드. 실제로 무엇을 묻는지 미리 보여 준다. */
  closingQuestion: { step: string; q: string; options: string[]; start: number };
}) {
  return (
    <div className="bg-baro-page">
      {/* ① 첫 칸. 옅은 하늘색 한 면(draft3) 위에 흰 카드. 그 아래는 흰색 · 회색 띠가 번갈아 온다. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#E4EEFF] via-[#EEF4FF] to-white in-[.draft3-theme]:bg-baro-blue-50 in-[.draft3-theme]:bg-none">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-[28rem] rounded-full bg-[radial-gradient(circle,rgba(0,73,229,0.12),transparent_65%)] in-[.draft3-theme]:hidden"
        />
        {/* 포켓컴퍼니 소개 머리처럼 덜어낸다: 위치 줄은 맨 위 한 줄로 떼고, 그 아래 여백을 크게 둔 두 칸.
            왼쪽은 큰 제목 → 설명 → 단추 → 조용한 안내 한 줄(무료 · 소요 시간)만. 서비스 이름은 위치 줄에 있어 머리말로 되풀이하지 않는다.
            오른쪽은 모음 카드 줄(또는 결과 예시 카드). 알약 여러 개를 제목 위에 늘어놓지 않는다. */}
        <div className="relative mx-auto max-w-7xl px-4.5 pt-6 pb-16 sm:pt-8 sm:pb-24 lg:px-8 lg:pb-28">
          <nav aria-label="현재 위치">
            <ol className="flex items-center gap-1 text-body-3 font-medium text-slate-600">
              {[{ label: "홈", href: "/" }, ...crumbs].map((c, i, all) => (
                <li key={`${c.label}-${i}`} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight aria-hidden className="size-3.5 text-slate-500" />}
                  {c.href && i < all.length - 1 ? (
                    <Link href={c.href}>{c.label}</Link>
                  ) : (
                    <span aria-current="page" className="text-slate-900">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-10 grid grid-cols-[minmax(0,1fr)] items-center gap-12 sm:mt-14 lg:mt-16 lg:grid-cols-[25rem_minmax(0,1fr)] lg:gap-16">
            <div className="min-w-0 motion-safe:animate-[situation-in_600ms_ease-out_backwards]">
              <h1 className="text-headline-3 leading-[1.25] font-extrabold tracking-[-0.035em] break-keep text-slate-900 sm:text-headline-1 sm:leading-[1.25]">
                {title}
              </h1>
              <p className="mt-6 max-w-lg text-body-1 leading-[1.65] font-medium break-keep text-slate-600">{description}</p>
              <div className="mt-10">{actions}</div>
              {badges.length > 0 && (
                <ul className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-3 font-semibold text-slate-600">
                  {badges.map((b) => (
                    <li key={b} className="flex items-center gap-1.5">
                      <Check aria-hidden strokeWidth={2.5} className="size-4 text-baro-blue" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="motion-safe:animate-[situation-in_600ms_ease-out_backwards] [animation-delay:150ms]">{preview}</div>
          </div>
        </div>
      </section>

      {/* ② 진단으로 알 수 있는 것(얻는 것). 첫 칸 바로 아래에 둬 "해 보면 무엇을 받는지"를 먼저 보인다. /draft3처럼 폭을 꽉 채운 회색 띠 위에 흰 카드를 얹어 진행 순서와 구역을 나눈다.
          그림은 홈 서비스 그림과 같은 화풍으로 직접 그린 것(landing-item-icons).
          넓은 화면의 칸 수는 개수에 맞춘다 - 6개는 3칸 두 줄, 4개는 4칸 한 줄. 3칸에 4개를 놓으면 한 칸이 혼자 남는다.
          칸이 좁아지는 4칸에서도 글이 눌리지 않게, 휴대폰이 아니면 그림을 글 위에 둔다. */}
      {/* ②~③은 첫 칸과 같은 짜임: 왼쪽 칸에 머리말 · 두 줄 제목 · 설명, 오른쪽 칸에 내용.
          바탕은 하늘색(첫 칸) → 흰색(알 수 있는 것) → 회색(진행 순서) → 흰색(마무리)으로 번갈아 구역을 나눈다.
          하늘색 바로 아래가 회색이면 두 옅은 색이 붙어 탁해 보여 흰색부터 둔다. */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4.5 py-14 sm:py-20 lg:px-8">
          <Reveal className="group">
            <div className="grid items-center gap-10 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-16">
              <SplitHead eyebrow="진단 결과" title={itemsTitle} description={itemsDescription} />
              {/* 칸마다 상자를 두지 않고 흰 바탕에 회색 원 그림 + 글만 놓는다(상자 여러 개의 무게를 덜기).
                  여섯 개는 3열 두 줄, 네 개는 2열 두 줄 - 3열에 네 개를 놓으면 하나가 혼자 남는다. */}
              <PlayWhenSeen>
              <ul className={`grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-7 sm:gap-y-9 ${items.length % 3 === 0 ? "sm:grid-cols-3" : ""}`}>
                {/* 칸마다 차례로 떠오른다. 감싼 Reveal(group)의 data-reveal 을 따라간다(/draft3 소식 목록과 같은 방식). */}
                {/* 칸이 떠오른 뒤 그림 속 조각이 한 번 움직인다(--li-delay, landing-item-icons · globals.css). */}
                {items.map(({ icon, title: itemTitle, desc }, i) => (
                  <li
                    key={itemTitle}
                    className="min-w-0 transition-[opacity,translate] duration-500 ease-out group-data-[reveal=hidden]:translate-y-6 group-data-[reveal=hidden]:opacity-0"
                    style={{ transitionDelay: `${150 + i * 80}ms`, ["--li-delay" as string]: `${450 + i * 120}ms` }}
                  >
                    {/* 그림 속 움직임이 잘 보이게 원과 그림을 크게 둔다(원 64px → 넓은 화면 80px). */}
                    <span className="flex size-16 items-center justify-center rounded-full bg-gov-surface sm:size-20 [&>svg]:size-11 sm:[&>svg]:size-14">
                      <LandingItemIcon id={icon} />
                    </span>
                    <p className="mt-3 text-body-2 font-semibold break-keep text-slate-900">{itemTitle}</p>
                    <p className="mt-1 text-body-3 font-medium break-keep text-slate-600">{desc}</p>
                  </li>
                ))}
              </ul>
              </PlayWhenSeen>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ③ 진행 순서. 회색 띠 위, 오른쪽 칸에 단계를 세로로 쌓는다(흰 카드 + 옅은 회색 원 아이콘). 화면에 들어오면 한 단계씩 떠오른다. */}
      <section>
        <div className="mx-auto max-w-7xl px-4.5 py-14 sm:py-20 lg:px-8">
          <Reveal className="group">
            <div className="grid items-center gap-10 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-16">
              <SplitHead
                eyebrow="진행 순서"
                title={
                  <>
                    이렇게
                    <br />
                    진행돼요
                  </>
                }
                description={stepsDescription}
              />
              <ol className="flex flex-col gap-3">
                {steps.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <li
                      key={s.title}
                      className="flex items-center gap-4 rounded-card bg-white px-5 py-5 transition-[opacity,translate] duration-500 ease-out group-data-[reveal=hidden]:translate-y-6 group-data-[reveal=hidden]:opacity-0 sm:gap-5 sm:px-6"
                      style={{ transitionDelay: `${150 + i * 90}ms` }}
                    >
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gov-surface sm:size-16">
                        {Icon && <Icon aria-hidden strokeWidth={1.5} className="size-7 text-baro-navy sm:size-8" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-body-3 font-semibold text-baro-blue-600">{i + 1}단계</p>
                        <p className="mt-0.5 text-body-1 font-semibold break-keep text-slate-900">{s.title}</p>
                        <p className="mt-1 text-body-3 font-medium break-keep text-slate-600">{s.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ④ 마무리. 정보는 여기까지 보여 주고, 내게 맞는 것은 진단으로 - 끝에서 한 번 더 시작 단추를 건넨다.
          위쪽 첫 칸 · 알 수 있는 것이 이미 "무엇을 받는지 · 몇 분 걸리는지"를 말해서, 여기서는 되풀이하지 않고
          위에서 안 보여 준 "실제로 무엇을 묻는지"를 첫 질문 카드로 보여 준다(누가 하나씩 눌러 보듯 움직인다).
          카드는 판 아래로 걸쳐 잘려 "이어서 더 있다"가 보인다. 안내 글은 판 아래 글만. */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4.5 py-14 sm:py-20 lg:px-8">
          {/* 위 구역들처럼 화면에 들어올 때 살짝 떠오른다(홈 상담 띠와 같은 방식). */}
          <Reveal>
          <div className="relative overflow-hidden rounded-card bg-baro-blue-50 px-6 pt-12 sm:px-12 lg:pt-14">
            <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_26rem]">
              {/* 넓은 화면에서 글은 판 위쪽에 붙인다. 바닥에 맞추면 제목이 아래로 처져 보였다. 카드는 바닥에 걸쳐 둔다. */}
              <div className="pb-12 text-center lg:self-start lg:pt-4 lg:pb-14 lg:text-left">
                <h2 className="text-title-2 leading-[1.4] font-extrabold tracking-[-0.02em] break-keep text-balance text-slate-900 sm:text-title-1 max-sm:[&_br]:hidden">
                  {closingTitle}
                </h2>
                <p className="mt-4 text-body-1 font-medium break-keep text-slate-700">{closingLead}</p>
                <div className="mt-8 flex w-full justify-center lg:justify-start">{actions}</div>
              </div>
              <div aria-hidden>
                <FirstQuestionCard {...closingQuestion} />
              </div>
            </div>
          </div>
          </Reveal>
          <p className="mt-8 text-body-3 leading-relaxed font-medium break-keep text-slate-600">{note}</p>
        </div>
      </section>
    </div>
  );
}

/**
 * 오른쪽 결과 예시 카드의 틀. 옅은 하늘 바탕 위 흰 카드 한 장(모서리 20px, 테두리 · 그림자 없음 - /draft3 카드와 같게).
 * "예시"임을 맨 위에 밝힌다 - 실제 결과로 오해하지 않게.
 */
export function PreviewCard({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div aria-hidden className="mx-auto w-full max-w-[26rem] rounded-card bg-white p-6 shadow-float sm:p-8">
      <p className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-caption-1 font-semibold text-slate-600">{label}</p>
      <p className="mt-3 text-title-3 font-bold text-slate-900">{title}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

/** 왼쪽 제목 칸. 모음 구역(DiagnosisShowcase) 왼쪽 칸과 같은 머리말 · 두 줄 제목 · 설명. 휴대폰은 가운데 맞춤. */
function SplitHead({ eyebrow, title, description }: { eyebrow: string; title: React.ReactNode; description: React.ReactNode }) {
  return (
    <div className="text-center lg:text-left">
      <p className="text-body-3 font-semibold text-slate-600">{eyebrow}</p>
      <h2 className="mt-1.5 text-title-2 leading-[1.4] font-extrabold tracking-[-0.02em] break-keep text-slate-900">{title}</h2>
      <p className="mt-4 text-body-2 font-medium break-keep text-slate-600">{description}</p>
    </div>
  );
}
