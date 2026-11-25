import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { Crumb } from "./page-head";

/*
  진단으로 시작하는 서비스(직업진단 · 지원금 찾기)의 첫 화면.
  다른 세부 화면은 "위치 줄 + 제목" 머리 아래 바로 내용이지만, 여기는 처음 온 사람이 무엇을 얻는지 보고
  시작 단추를 누르게 하는 곳이라 소개 화면처럼 짠다:
  ① 첫 칸 - 왼쪽 큰 제목 · 시작 단추, 오른쪽 결과 예시 카드(받게 될 것을 미리 보여 준다)
  ② 이렇게 진행돼요 - 번호 세 개를 선으로 잇는다
  ③ 알 수 있는 것 - 그림 붙은 칸
  ④ 안내 글
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
      {/* ① 첫 칸. 바탕은 화면 머리(PageHead)와 같은 옅은 하늘색 그라데이션. */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#E4EEFF] via-[#EEF4FF] to-white">
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
                <li key={b} className="rounded-full bg-white px-3 py-1 text-body-3 font-bold text-atomic-blue-600">
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
        {/* ② 진행 순서. 넓은 화면은 가로로 번호를 선으로 잇고, 휴대폰은 세로로 잇는다. */}
        <section className="mt-16 sm:mt-20">
          <h2 className="text-title-2 font-extrabold text-slate-900">이렇게 진행돼요</h2>
          <ol className="relative mt-8 grid gap-8 md:grid-cols-3 md:gap-6">
            <span aria-hidden className="absolute top-6 bottom-6 left-6 w-px bg-brand-blue-200 md:top-6 md:right-[16.6%] md:bottom-auto md:left-[16.6%] md:h-px md:w-auto" />
            {steps.map((s, i) => (
              <li key={s.title} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-atomic-blue-600 text-title-3 font-extrabold text-white ring-8 ring-white">
                  {i + 1}
                </span>
                <div className="md:mt-4">
                  <p className="text-body-1 font-bold text-slate-900">{s.title}</p>
                  <p className="mt-1 text-body-3 font-medium break-keep text-slate-600">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ③ 알 수 있는 것. 그림은 옅은 파랑 네모 위에. */}
        <section className="mt-16 sm:mt-20">
          <h2 className="text-title-2 font-extrabold text-slate-900">{itemsTitle}</h2>
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {items.map(({ icon: Icon, title: itemTitle, desc }) => (
              <li key={itemTitle} className="flex items-start gap-4 rounded-xl border border-border p-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-blue-50 text-atomic-blue-600">
                  <Icon className="size-6" />
                </span>
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
      <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-2 rounded-2xl bg-brand-blue-100" />
      <div className="relative rounded-2xl border border-border bg-white p-6 shadow-[0_12px_32px_rgba(0,41,128,0.10)]">
        <p className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-caption-1 font-semibold text-slate-600">{label}</p>
        <p className="mt-3 text-title-3 font-extrabold text-slate-900">{title}</p>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
