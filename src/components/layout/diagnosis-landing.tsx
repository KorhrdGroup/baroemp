import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { Crumb } from "./page-head";

/*
  진단으로 시작하는 서비스(직업진단 · 지원금 찾기)의 첫 화면.
  다른 세부 화면은 "위치 줄 + 제목" 머리 아래 바로 내용이지만, 여기는 처음 온 사람이 무엇을 얻는지 보고
  시작 단추를 누르게 하는 곳이라 소개 화면처럼 짠다:
  ① 첫 칸 - 왼쪽 큰 제목 · 시작 단추, 오른쪽 결과 예시 카드(받게 될 것을 미리 보여 준다)
  ② 이렇게 진행돼요 - 옅은 파랑 판 세 칸을 화살표로 잇는다
  ③ 알 수 있는 것 - 그림 붙은 칸
  ④ 안내 글
  무게: 굵기 800은 제목에만, 칸 제목은 700, 나머지는 500~600. 진한 파랑은 시작 단추와 핵심 숫자에만 -
  번호 · 표시까지 진하게 칠하면 화면이 무겁고 투박해진다. 모서리는 카드 12px, 단추 · 표시 8px 두 가지.
  그림은 홈 서비스 그림처럼 면을 채운 두 톤(진한 파랑 선 + 옅은 파랑 면)으로 맞춘다.
*/

export interface LandingStep {
  title: string;
  desc: string;
}

export interface LandingItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export function DiagnosisLanding({
  crumbs,
  badges,
  title,
  description,
  actions,
  preview,
  steps,
  itemsTitle,
  items,
  note,
}: {
  crumbs: Crumb[];
  /** 제목 위 작은 표시(예: "무료", "약 3~5분"). */
  badges: string[];
  title: React.ReactNode;
  description: React.ReactNode;
  /** 시작 단추들. */
  actions: React.ReactNode;
  /** 오른쪽 결과 예시 카드. */
  preview: React.ReactNode;
  steps: LandingStep[];
  itemsTitle: string;
  items: LandingItem[];
  note: React.ReactNode;
}) {
  return (
    <div className="bg-white">
      {/* ① 첫 칸. 바탕은 화면 머리(PageHead)와 같은 옅은 하늘색. 아래로 흰색까지 풀어 다음 구역과 끊기지 않게. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#E4EEFF] via-[#EEF4FF] to-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-[28rem] rounded-full bg-[radial-gradient(circle,rgba(0,73,229,0.12),transparent_65%)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4.5 pt-6 pb-12 sm:pt-8 sm:pb-16 lg:grid-cols-[1fr_26rem] lg:gap-16 lg:px-8">
          <div className="min-w-0">
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

            <ul className="mt-8 flex flex-wrap gap-2 sm:mt-10">
              {badges.map((b) => (
                <li key={b} className="rounded-lg bg-white/90 px-3 py-1 text-body-3 font-semibold text-slate-700">
                  {b}
                </li>
              ))}
            </ul>
            <h1 className="mt-4 text-headline-3 leading-[1.3] font-extrabold tracking-[-0.03em] break-keep text-slate-900 sm:text-headline-1 sm:leading-[1.3]">
              {title}
            </h1>
            <p className="mt-4 max-w-xl text-body-1 leading-[1.6] font-medium break-keep text-slate-700">{description}</p>
            <div className="mt-8">{actions}</div>
          </div>

          {preview}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4.5 lg:px-8">
        {/* ② 진행 순서. 흰 바탕에 번호 · 선만 두면 떠 보여, 아래 "알 수 있는 것"과 같은 세 칸 격자에 옅은 파랑 판으로 앉힌다.
            칸 사이 화살표로 순서를 잇는다(넓은 화면만). */}
        <section className="mt-12 sm:mt-14">
          <h2 className="text-title-2 font-extrabold text-slate-900">이렇게 진행돼요</h2>
          <ol className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            {steps.map((s, i) => (
              <li key={s.title} className="relative flex items-start gap-4 rounded-xl bg-[#F1F6FF] p-5 md:flex-col md:gap-3 md:p-6">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-body-1 font-bold text-atomic-blue-600">
                  {i + 1}
                </span>
                <div className="min-w-0 pt-1.5 md:pt-0">
                  <p className="text-body-1 font-bold text-slate-900">{s.title}</p>
                  <p className="mt-1 text-body-3 font-medium break-keep text-slate-600">{s.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-1/2 -right-[1.375rem] z-10 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full border border-brand-blue-200 bg-white text-atomic-blue-600 md:flex"
                  >
                    <ChevronRight className="size-4" />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* ③ 알 수 있는 것. 그림은 네모 없이 두 톤으로(선은 진한 파랑, 면은 옅은 파랑).
            넓은 화면의 칸 수는 개수에 맞춘다 - 6개는 3칸 두 줄, 4개는 4칸 한 줄. 3칸에 4개를 놓으면 한 칸이 혼자 남는다.
            칸이 좁아지는 4칸에서도 글이 눌리지 않게, 휴대폰이 아니면 그림을 글 위에 둔다. */}
        <section className="mt-12 sm:mt-16">
          <h2 className="text-title-2 font-extrabold text-slate-900">{itemsTitle}</h2>
          <ul className={`mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 ${items.length % 3 === 0 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
            {items.map(({ icon: Icon, title: itemTitle, desc }) => (
              <li key={itemTitle} className="flex items-start gap-4 rounded-xl border border-border p-5 sm:flex-col sm:gap-3 sm:p-6">
                <Icon aria-hidden className="size-9 shrink-0 text-atomic-blue-600" fill="var(--atomic-blue-100)" strokeWidth={1.75} />
                <div className="min-w-0">
                  <p className="text-body-1 font-bold text-slate-900">{itemTitle}</p>
                  <p className="mt-1 text-body-3 font-medium break-keep text-slate-600">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ④ 안내 글 */}
        <p className="mt-12 mb-16 rounded-xl bg-slate-50 p-5 text-body-3 leading-relaxed font-medium text-slate-600 sm:mb-24">{note}</p>
      </div>
    </div>
  );
}

/**
 * 오른쪽 결과 예시 카드의 틀. 뒤에 한 장을 비스듬히 깔아 카드 묶음처럼 보이게 한다.
 * "예시"임을 맨 위에 밝힌다 - 실제 결과로 오해하지 않게.
 */
export function PreviewCard({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[26rem]">
      <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-2 rounded-xl bg-brand-blue-100" />
      <div className="relative rounded-xl border border-border bg-white p-6 shadow-[0_12px_32px_rgba(0,41,128,0.10)]">
        <p className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-caption-1 font-semibold text-slate-600">{label}</p>
        <p className="mt-3 text-title-3 font-bold text-slate-900">{title}</p>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
