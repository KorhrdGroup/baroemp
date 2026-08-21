import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface IntroHeroProps {
  /** 히어로 상단 원형 배지 아이콘 */
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  /** 소요시간·비용 등 짧은 정보 칩 */
  infoItems: { icon: LucideIcon; label: string }[];
  /** 히어로 하단에 걸치는 CTA 바의 문구 */
  ctaHeadline: string;
  ctaDescription: string;
  /** CTA 바 오른쪽 버튼. 진단 시작 로직이 화면마다 달라 주입받는다. */
  cta: ReactNode;
  highlightTitle: string;
  highlights: string[];
  note: ReactNode;
}

export function IntroHero({
  icon: Icon,
  title,
  description,
  infoItems,
  ctaHeadline,
  ctaDescription,
  cta,
  highlightTitle,
  highlights,
  note,
}: IntroHeroProps) {
  return (
    <>
      {/* pb는 CTA 바가 겹쳐 올라올 자리다. 아래 카드의 -mt와 짝을 이룬다. */}
      <section className="relative bg-brand-blue-50 pb-37 sm:pb-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="absolute -left-24 -top-16 size-[26rem] rounded-full bg-brand-blue-100 opacity-70 blur-3xl" />
          <span className="absolute -right-24 top-4 size-[22rem] rounded-full bg-white opacity-80 blur-3xl" />
          <span className="absolute bottom-0 left-1/2 size-[20rem] -translate-x-1/2 rounded-full bg-brand-blue-100/60 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pt-16 text-center sm:px-6 sm:pt-20 lg:px-8">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-brand-blue-600 ring-1 ring-brand-blue-100">
            <Icon className="size-7" />
          </span>

          {/*
           * 굵기를 800으로 두되 font-synthesis-weight:none 을 건다.
           * 독립고딕(400 단일 굵기)이 뜨면 가짜 볼드 없이 원래 굵기로 그려지고,
           * 로딩에 실패해 2순위 Pretendard로 떨어지면 실제 ExtraBold로 렌더링된다.
           */}
          <h1 className="mx-auto mt-6 max-w-3xl break-keep font-dongnim text-headline-3 font-extrabold tracking-tight text-slate-800 [font-synthesis-weight:none] sm:text-headline-2">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl break-keep text-body-1-reading text-slate-600">{description}</p>

          {/* 그라데이션 배경 위에 글자만 떠 있으면 묻힌다. 흰 pill로 각 항목을 떼어놓는다. */}
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {infoItems.map(({ icon: InfoIcon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-label-1 font-semibold text-slate-600 ring-1 ring-border"
              >
                <InfoIcon className="size-4 text-brand-blue-600" />
                {label}
              </span>
            ))}
          </div>
        </div>

      </section>

      {/*
       * 히어로 배경 경계가 카드 한가운데를 지나가게 위로 끌어올린다.
       * 섹션 안에 두고 -mb를 주면 마진 상쇄로 섹션 높이가 줄지 않아 배경이 카드 바닥에 딱 붙는다.
       * -mt는 카드 높이의 절반. sm 이상은 가로 배치라 112px(버튼 h-14 + p-7 상하), 모바일은
       * 버튼이 아래로 내려가 182px가 되므로 값을 나눠 잡는다. CTA 문구 줄 수가 바뀌면 재조정이 필요하다.
       */}
      <div className="relative z-10 mx-auto -mt-23 max-w-4xl px-4 sm:-mt-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 ring-1 ring-border sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="text-left">
            <p className="text-body-2 font-bold text-slate-900">{ctaHeadline}</p>
            <p className="mt-1 text-label-1 text-slate-500">{ctaDescription}</p>
          </div>
          <div className="shrink-0">{cta}</div>
        </div>
      </div>

      <section className="bg-white pb-16 pt-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-title-2 font-extrabold text-slate-900 sm:text-headline-3">
            {highlightTitle}
          </h2>
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {highlights.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 rounded-xl bg-brand-blue-50/60 px-5 py-4 text-body-2 font-medium text-slate-700"
              >
                <CheckCircle2 className="size-5 shrink-0 text-brand-blue-600" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-label-1 leading-relaxed text-slate-400">{note}</p>
        </div>
      </section>
    </>
  );
}

