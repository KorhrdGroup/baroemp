import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { QUALIFICATIONS } from "@/features/home-draft/qualification-section";
import { ServiceIcon } from "@/features/home-draft/service-icons";
import { labelRegion } from "@/lib/labels";
import { ConsultIllustration } from "./consult-illustration";
import { QualificationIcon } from "./qualification-icons";
import type { Region, SupportProgram } from "@/types";

/*
  /draft3 전용 조각. /draft2 의 같은 조각은 테두리 상자 안에 담겨 있어, 상자가 겹겹이 쌓이면 서류 양식처럼 딱딱해졌다.
  여기서는 테두리를 걷고 여백과 가는 구분선만으로 나눈다.
  모서리는 두 가지만: 판 · 카드 12px(rounded-xl), 단추 · 글자 단추 8px(rounded-lg).
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
      <ul className="grid grid-cols-3 overflow-hidden rounded-xl bg-white shadow-[0_6px_20px_rgba(15,23,42,0.07)] lg:grid-cols-6">
        {SERVICES.map((s, i) => (
          <li
            key={s.id}
            className={`${i % 3 !== 0 ? "border-l" : ""} ${i >= 3 ? "border-t lg:border-t-0" : ""} ${i === 3 ? "lg:border-l" : ""} border-slate-100`}
          >
            <Link href={s.href} className="flex flex-col items-center gap-2 px-2 py-5 sm:gap-3 sm:py-7">
              <ServiceIcon id={s.id} />
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
 * 사진 대신 정부 · 공공기관 누리집식 평면 그림(consult-illustration) - 나머지 서비스 그림과 결이 맞는다.
 * 남색 띠 대신 옅은 회색 판 - 첫 화면 남색과 위아래로 겹치지 않게.
 */
export function Draft3ConsultBand() {
  return (
    <section className="mx-auto max-w-7xl px-4.5 lg:px-8">
      <div className="grid grid-cols-1 items-center overflow-hidden rounded-xl bg-gov-surface lg:grid-cols-2">
        <div className="flex items-center justify-center bg-brand-blue-50 px-6 pt-8 pb-4 lg:h-full lg:min-h-[22rem] lg:p-10">
          <ConsultIllustration className="w-full max-w-[26rem]" />
        </div>
        <div className="p-6 sm:p-10 lg:p-14">
          <p className="text-body-3 font-semibold text-slate-600">무료 1:1 취업 상담</p>
          <h2 className="mt-2 text-title-2 leading-[1.35] font-bold tracking-[-0.02em] break-keep text-slate-900">
            혼자 찾기 어렵다면,
            <br />
            상담사가 같이 찾아드려요
          </h2>
          <p className="mt-3 text-body-1 font-medium break-keep text-slate-700">
            경력 정리부터 이력서, 지원할 곳 고르기까지 한 번에 도와드려요.
          </p>
          <Link
            href="/consulting"
            className="mt-8 inline-flex h-14 items-center gap-1 rounded-lg bg-atomic-blue-600 px-7 text-body-1 font-bold text-white"
          >
            상담 신청하기
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        </div>
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
        <ul className="divide-y divide-border">
          {programs.map((p) => (
            <li key={p.id} className="py-4">
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
 * 자격증으로 찾기. 옆 소식 목록과 높이를 맞춘 회색 판 - 글자 단추만 있으면 아래가 비어 보여서.
 * 단추는 흰 바탕 두 줄 격자, 판 높이만큼 늘어나 아래가 비지 않게.
 */
export function Draft3QualificationLinks() {
  return (
    <div className="flex h-full flex-col rounded-xl bg-gov-surface p-6 sm:p-7">
      <h3 className="text-body-1 font-bold text-slate-900">자격증으로 찾기</h3>
      <p className="mt-1 text-body-3 font-medium text-slate-600">가진 자격증으로 맞는 공고를 모아 봐요.</p>
      <ul className="mt-5 grid flex-1 auto-rows-fr grid-cols-2 gap-2">
        {QUALIFICATIONS.map((name) => (
          <li key={name}>
            <Link
              href={`/jobs?keyword=${encodeURIComponent(name)}`}
              className="flex h-full min-h-12 items-center gap-3 rounded-lg bg-white px-4 text-body-2 font-semibold text-slate-800"
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
