import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardBorderClass, cardShadowClass } from "@/lib/ui-classes";

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
      <section className="relative overflow-hidden bg-gov-surface pb-37 sm:pb-28">
        {/* 홈 히어로와 같은 밝은 파랑 한 갈래. 색을 여러 갈래로 섞으면 위에 얹히는 흰 요소가 묻힌다. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(160deg,#FFFFFF_0%,var(--gov-ice)_38%,var(--gov-sky)_100%)]" />
          <span className="absolute -right-24 -top-16 size-[26rem] rounded-full bg-white opacity-60 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pt-10 text-center sm:px-6 sm:pt-14 lg:px-8">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-brand-blue-600 ring-1 ring-brand-blue-100">
            <Icon className="size-7" />
          </span>

          {/*
           * 배너 제목은 홈 히어로와 같은 규칙을 쓴다.
           * 굵기 900은 배너에서만 쓰는 예외이고(다른 제목은 800), 두 줄로 놓이는 경우가 많아
           * 타이포 토큰의 기본 행간(1.2) 대신 1.35를 준다.
           */}
          <h1 className="mx-auto mt-6 max-w-3xl break-keep text-headline-3 font-black leading-[1.35] tracking-tight text-slate-900 sm:text-headline-2">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl break-keep text-body-1-reading text-slate-600">{description}</p>

          {/* 그라데이션 배경 위에 글자만 떠 있으면 묻힌다. 흰 pill로 각 항목을 떼어놓는다. */}
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {infoItems.map(({ icon: InfoIcon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-label-1 font-semibold text-slate-600"
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
        <div className={cn(
            "flex flex-col gap-4 rounded-2xl bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7",
            cardBorderClass,
            cardShadowClass,
          )}>
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
          {/*
            항목이 3의 배수면 넓은 화면에서 3열로 놓아 줄 수를 줄인다.
            아니면 2열을 유지한다. 3열로 두면 마지막 줄에 한 장만 남아 옆이 빈다
            (지원금찾기는 항목이 4개다).
          */}
          <ul
            className={cn(
              "mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2",
              highlights.length % 3 === 0 && "lg:grid-cols-3",
            )}
          >
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

