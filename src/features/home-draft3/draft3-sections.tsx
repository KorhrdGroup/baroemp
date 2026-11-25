import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { QUALIFICATIONS } from "@/features/home-draft/qualification-section";
import { ServiceIcon } from "@/features/home-draft/service-icons";
import { labelRegion } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { ConsultIllustration } from "./consult-illustration";
import { QualificationIcon } from "./qualification-icons";
import type { Region, SupportProgram } from "@/types";

/*
  /draft3 전용 조각. /draft2 의 같은 조각은 테두리 상자 안에 담겨 있어, 상자가 겹겹이 쌓이면 서류 양식처럼 딱딱해졌다.
  여기서는 테두리를 걷고 여백과 가는 구분선만으로 나눈다.
  모서리는 두 가지만: 판 · 카드 20px(rounded-card), 단추 · 글자 단추 12px(rounded-xl) - 경기 잡아바처럼 둥글게.
*/

const SERVICES = [
  { id: "jobs", label: "일자리 찾기", href: "/jobs" },
  { id: "assessment", label: "직업진단", href: "/assessment" },
  { id: "resume", label: "이력서 첨삭", href: "/resume" },
  { id: "coverLetter", label: "자기소개서", href: "/cover-letter" },
  { id: "support", label: "지원금 찾기", href: "/support" },
  { id: "consulting", label: "취업 상담", href: "/consulting" },
];

/**
 * 자주 찾는 서비스. /draft2 와 같은 자리(첫 화면 아래 끝에 반쯤 걸침)지만 테두리를 빼고
 * 옅은 그림자 하나로만 남색 위에 띄운다. 칸막이는 아주 옅게.
 */
export function Draft3ServiceGrid() {
  return (
    <nav aria-label="자주 찾는 서비스" className="relative mx-auto -mt-14 max-w-7xl px-4.5 sm:-mt-20 lg:px-8">
      <ul className="grid grid-cols-3 overflow-hidden rounded-card bg-white shadow-float lg:grid-cols-6">
        {SERVICES.map((s, i) => (
          <li
            key={s.id}
            className={cn(
              "relative",
              // 칸막이는 끝까지 긋지 않고 위아래를 띄운 짧은 선으로 - 판이 칸칸이 잘린 표처럼 보이지 않게.
              (i % 3 !== 0 || i === 3) &&
                "before:absolute before:inset-y-5 before:left-0 before:w-px before:bg-slate-200/70 sm:before:inset-y-7",
              i === 3 && "before:hidden lg:before:block",
              i >= 3 && "after:absolute after:inset-x-4 after:top-0 after:h-px after:bg-slate-200/70 lg:after:hidden",
            )}
          >
            {/* 처음 열 때 그림 · 이름이 왼쪽부터 차례로 아래에서 떠오른다(상황별 서비스 카드와 같은 situation-in). 움직임 줄이기면 끈다. */}
            <Link
              href={s.href}
              className="group/svc flex flex-col items-center gap-2.5 px-2 py-5 motion-safe:animate-[situation-in_500ms_ease-out_backwards] sm:gap-3 sm:py-7"
              style={{ animationDelay: `${150 + i * 70}ms` }}
            >
              {/* 그림을 옅은 파랑 원에 얹어 크기 · 무게를 고르게 맞춘다. 칸에 마우스를 올리면 원 둘레에 남색과 파랑 사이 빛 그림자가 살짝 진다. */}
              <span className="flex size-14 items-center justify-center rounded-full bg-brand-blue-50 transition-shadow duration-200 group-hover/svc:shadow-icon-hover sm:size-[4.5rem] [&>svg]:size-8 sm:[&>svg]:size-10">
                <ServiceIcon id={s.id} />
              </span>
              <span className="text-body-2 font-semibold whitespace-nowrap text-slate-800 sm:text-body-1">{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * 맨 아래 상담 구역. 아이콘뿐이던 화면에 사람이 보이는 그림 한 장을 둔다(상담 장면).
 * 파랑(#2469FF) 낮은 띠 - 첫 화면 남색과 겹치지 않고 페이지 끝을 가볍게 맺는다.
 * 남색 띠 대신 옅은 회색 판 - 첫 화면 남색과 위아래로 겹치지 않게.
 */
export function Draft3ConsultBand() {
  return (
    <section className="mx-auto max-w-7xl px-4.5 lg:px-8">
      {/* 파랑 가로 띠 하나: 낮은 높이로 왼쪽 작은 상담 그림 · 가운데 글 · 오른쪽 흰 단추를 한 줄에. 페이지 끝을 가볍게 맺는다.
          오른쪽 위에 옅은 흰 원 하나로 밋밋하지 않게. 휴대폰은 세로로 쌓고 가운데 정렬. */}
      <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-card bg-baro-blue px-7 py-8 sm:px-10 lg:flex-row lg:gap-10 lg:py-6 lg:pl-8">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/10" />
        <ConsultIllustration className="relative w-48 shrink-0 lg:w-56" />
        <div className="relative flex-1 text-center lg:text-left">
          <p className="text-body-2 font-semibold text-baro-blue-100">무료 1:1 취업 상담</p>
          <h2 className="mt-2 text-title-1 leading-[1.35] font-extrabold tracking-[-0.02em] break-keep text-white">
            혼자 찾기 어렵다면, 상담사가 같이 찾아드려요
          </h2>
          <p className="mt-2 text-body-1 font-medium break-keep text-white/85">
            경력 정리부터 이력서, 지원할 곳 고르기까지 한 번에 도와드려요.
          </p>
        </div>
        <Link
          href="/consulting"
          className="relative inline-flex h-14 shrink-0 items-center gap-1 rounded-xl bg-white px-7 text-body-1 font-bold text-baro-blue"
        >
          상담 신청하기
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

/** 구역 제목. 머리말(회색, 작게) → 제목(24px · 700). 머리말과 크기 차이를 줄여 덜 쾅쾅 찍히게. */
export function Draft3Heading({
  eyebrow,
  children,
  moreHref,
}: {
  eyebrow: string;
  children: React.ReactNode;
  moreHref?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-body-3 font-semibold text-slate-600">{eyebrow}</p>
        <h2 className="mt-1.5 text-title-3 font-bold tracking-[-0.02em] break-keep text-slate-900 sm:text-title-2">{children}</h2>
      </div>
      {moreHref && (
        <Link href={moreHref} className="inline-flex shrink-0 items-center gap-0.5 text-body-2 font-semibold text-slate-700">
          더보기
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function regionText(p: SupportProgram): string {
  if (!p.regionScope || p.regionScope === "national") return "전국";
  return labelRegion(p.regionScope as Region);
}

/** 중장년 지원사업 소식. 테두리 상자 없이 제목 한 줄 + 위 · 아래 구분선. */
export function Draft3NewsList({ programs }: { programs: SupportProgram[] }) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-slate-300 pb-3">
        <h3 className="text-body-1 font-bold text-slate-900">중장년 지원사업</h3>
        <Link href="/support" className="inline-flex items-center gap-0.5 text-body-3 font-semibold text-slate-700">
          전체
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
      {programs.length > 0 ? (
        <ul className="divide-y divide-border border-b border-slate-300">
          {/* 줄마다 차례로 아래에서 떠오른다. 구역을 감싼 Reveal(group)의 data-reveal 을 따라간다(지원금 목록과 같은 방식). */}
          {programs.map((p, i) => (
            <li
              key={p.id}
              className="py-4 transition-[opacity,translate] duration-500 ease-out group-data-[reveal=hidden]:translate-y-6 group-data-[reveal=hidden]:opacity-0"
              style={{ transitionDelay: `${150 + i * 90}ms` }}
            >
              <Link href={`/support/${p.id}`} className="line-clamp-1 text-body-2 font-semibold text-slate-800">
                {p.title}
              </Link>
              <p className="mt-1 flex items-center gap-1.5 text-body-3 font-medium text-slate-600">
                <span className="truncate">{p.organization}</span>
                <span aria-hidden className="size-0.5 shrink-0 rounded-full bg-slate-400" />
                <span className="shrink-0">{regionText(p)}</span>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-body-3 font-medium text-slate-600">소식을 불러오지 못했어요.</p>
      )}
    </div>
  );
}

/**
 * 자격증으로 찾기. 옆 소식 목록과 높이를 맞춘 옅은 하늘색 판(지원금 대표 카드와 같은 색) - 글자 단추만 있으면 아래가 비어 보여서.
 * 단추는 흰 바탕 두 줄 격자, 판 높이만큼 늘어나 아래가 비지 않게.
 */
export function Draft3QualificationLinks() {
  return (
    <div className="flex h-full flex-col rounded-card bg-baro-blue-50 p-6 sm:p-7">
      <h3 className="text-body-1 font-bold text-slate-900">자격증으로 찾기</h3>
      <p className="mt-1 text-body-3 font-medium text-slate-600">가진 자격증으로 맞는 공고를 모아 봐요.</p>
      <ul className="mt-5 grid flex-1 auto-rows-fr grid-cols-2 gap-2">
        {QUALIFICATIONS.map((name) => (
          <li key={name}>
            <Link
              href={`/jobs?keyword=${encodeURIComponent(name)}`}
              className="flex h-full min-h-12 items-center gap-3 rounded-xl bg-white px-4 text-body-2 font-semibold text-slate-800 transition-shadow duration-200 hover:shadow-hover"
            >
              <QualificationIcon name={name} />
              {name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
