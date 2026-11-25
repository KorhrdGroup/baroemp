import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { QUALIFICATIONS } from "@/features/home-draft/qualification-section";
import { ServiceIcon } from "@/features/home-draft/service-icons";
import { SUPPORT_HIGHLIGHTS } from "@/features/home-draft/support-highlights-data";
import { resolveOrganizationLogo } from "@/lib/support/organization-logo";
import { labelRegion } from "@/lib/labels";
import type { Region, SupportProgram } from "@/types";

/*
  /draft2 아래 구역. /draft 가 둥근 카드를 여러 장 놓는다면 여기는 정부 누리집처럼
  표 · 목록 · 얇은 선으로 나누고, 모서리는 작게(8px) 둔다.
  구역 제목만 포켓컴퍼니식: 파란 머리말 한 줄 + 큰 제목, 핵심 낱말만 파랗게.
*/

/** 구역 제목. 머리말(파랑) → 큰 제목 → 오른쪽 끝 "더보기". */
export function SectionHeading({
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
        <p className="text-body-2 font-bold text-atomic-blue-600">{eyebrow}</p>
        <h2 className="mt-2 text-title-1 font-bold tracking-[-0.03em] break-keep text-slate-900 sm:text-headline-2">{children}</h2>
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

/** 강조 낱말. 제목 안에서 이 부분만 파랗게. */
export function Em({ children }: { children: React.ReactNode }) {
  return <span className="text-atomic-blue-600">{children}</span>;
}

function regionText(p: SupportProgram): string {
  if (!p.regionScope || p.regionScope === "national") return "전국";
  return labelRegion(p.regionScope as Region);
}

/** 공고 게시판 옆 "중장년 지원사업". 정부 누리집 공지사항 칸처럼 제목 아래 주체(기관) · 지역 한 줄. 누가 하는 사업인지가 믿음을 준다. */
export function SupportNewsList({ programs }: { programs: SupportProgram[] }) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="text-body-1 font-bold text-slate-900">중장년 지원사업</h3>
        <Link href="/support" aria-label="지원사업 더보기" className="text-slate-600">
          <Plus className="size-5" />
        </Link>
      </div>
      {programs.length > 0 ? (
        <ul className="flex-1 divide-y divide-border px-5">
          {programs.map((p) => (
            <li key={p.id} className="py-3.5">
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
        <p className="flex-1 px-5 py-8 text-body-3 text-slate-600">소식을 불러오지 못했어요.</p>
      )}
    </div>
  );
}

/** 공고 구역의 자격증 칸. /draft 의 자격증 카드 여섯 장을 글자 링크 묶음으로 줄였다. */
export function QualificationRow() {
  return (
    <div className="rounded-lg border border-border p-5">
      <p className="text-body-1 font-bold text-slate-900">자격증으로 찾기</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {QUALIFICATIONS.map((name) => (
          <li key={name}>
            <Link
              href={`/jobs?keyword=${encodeURIComponent(name)}`}
              className="block rounded-md border border-border bg-white px-3 py-1.5 text-body-3 font-semibold text-slate-800"
            >
              {name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 공고 구역 오른쪽 맨 위 숫자 칸. 첫 화면과 맨 아래 상담 띠의 남색을 한 칸 더 써서
 * 흰 칸들 사이에 무게를 준다 - 포켓컴퍼니식 "큰 숫자 하나".
 * 고용24처럼 아래에 입구(지역별 · 최신 · 급여순) 세 줄을 붙여 봤지만 칸이 정신없어져 숫자만 둔다.
 */
export function JobCountTile({ activeCount }: { activeCount: number }) {
  return (
    <Link href="/jobs" className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-lg bg-atomic-blue-900 p-5 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_90%_at_100%_0%,rgba(0,73,229,0.5),transparent_70%)]"
      />
      <div className="relative">
        <p className="text-body-2 font-semibold text-[#7FAAFF]">지금 진행 중인 공고</p>
        <p className="mt-1 text-headline-3 font-extrabold tracking-[-0.02em] text-white">
          {activeCount.toLocaleString("ko-KR")}
          <span className="ml-1 text-title-3 font-bold">건</span>
        </p>
      </div>
      <span className="relative inline-flex items-center gap-0.5 text-body-2 font-semibold text-white">
        전체 공고 보기
        <ChevronRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}

/**
 * 대표 지원제도 표. 줄마다 기관 · 제도 · 지원 내용 · 지역 · 신청 기간.
 * 휴대폰은 표 머리를 감추고 한 줄을 두 줄(기관 · 제도 / 금액 · 기간)로 접는다.
 */
export function SupportTable() {
  return (
    <table className="mt-8 w-full table-fixed border-t-2 border-slate-900 text-left">
      <caption className="sr-only">대표 지원제도</caption>
      <thead className="hidden border-b border-slate-300 bg-slate-50 lg:table-header-group">
        <tr className="text-body-3 font-semibold text-slate-700">
          <th scope="col" className="w-[16%] px-4 py-3">기관</th>
          <th scope="col" className="px-4 py-3">지원제도</th>
          <th scope="col" className="w-[17%] px-4 py-3">지원 내용</th>
          <th scope="col" className="w-[9%] px-4 py-3">지역</th>
          <th scope="col" className="w-[11%] px-4 py-3">신청 기간</th>
          <th scope="col" className="w-[10%] px-4 py-3"><span className="sr-only">바로가기</span></th>
        </tr>
      </thead>
      <tbody>
        {SUPPORT_HIGHLIGHTS.map((item) => {
          const logo = resolveOrganizationLogo(item.org);
          return (
            <tr key={item.id} className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-border py-4 lg:table-row lg:py-0">
              <td className="col-span-2 lg:px-4 lg:py-5">
                {logo ? (
                  <Image src={logo} alt={item.org} width={80} height={24} className="h-5 w-auto" />
                ) : (
                  <span className="text-body-3 font-semibold text-slate-700">{item.org}</span>
                )}
              </td>
              <td className="col-span-2 mt-2 lg:mt-0 lg:px-4 lg:py-5">
                <p className="text-body-1 font-bold text-slate-900">{item.title}</p>
                <p className="mt-1 text-body-3 font-medium break-keep text-slate-600">{item.summary}</p>
              </td>
              <td className="mt-2 text-body-1 font-bold text-atomic-blue-600 lg:mt-0 lg:px-4 lg:py-5">{item.amount}</td>
              <td className="hidden text-body-3 font-medium text-slate-700 lg:table-cell lg:px-4 lg:py-5">{item.region}</td>
              <td className="mt-2 self-center text-body-3 font-medium text-slate-700 lg:mt-0 lg:px-4 lg:py-5">
                <span className="lg:hidden">{item.region} · </span>
                {item.period}
              </td>
              <td className="col-span-2 mt-3 lg:mt-0 lg:px-4 lg:py-5">
                <Link
                  href="/support"
                  className="flex h-10 items-center justify-center rounded-md border border-slate-300 text-body-3 font-semibold text-slate-800 lg:h-9"
                >
                  자세히
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export const SITUATIONS = [
  {
    icon: "beginner",
    title: "새로운 일을 찾아요",
    links: [
      { label: "내게 맞는 직업 찾기", href: "/assessment" },
      { label: "경력 없어도 되는 일자리", href: "/jobs?beginner=1" },
      { label: "직업훈련 지원금", href: "/support" },
      { label: "1:1 취업컨설팅", href: "/consulting" },
    ],
  },
  {
    icon: "closing",
    title: "다시 일하고 싶어요",
    links: [
      { label: "곧 마감되는 공고", href: "/jobs?closingSoon=1" },
      { label: "이력서 다시 쓰기", href: "/resume" },
      { label: "받을 수 있는 지원금", href: "/support" },
      { label: "1:1 취업컨설팅", href: "/consulting" },
    ],
  },
  {
    icon: "salary",
    title: "지금 일하고 있어요",
    links: [
      { label: "급여 높은 공고", href: "/jobs?sort=salary_desc" },
      { label: "이력서 첨삭", href: "/resume" },
      { label: "자기소개서 첨삭", href: "/cover-letter" },
      { label: "1:1 취업컨설팅", href: "/consulting" },
    ],
  },
];

/**
 * 상황별 서비스. /draft 는 탭을 눌러 카드 네 장을 바꿔 보지만, 여기는 정부24 "생애주기별 서비스"처럼
 * 세 상황을 나란히 펼치고 갈 곳은 글자 링크로 늘어놓는다 - 누르지 않아도 다 보인다.
 */
export function SituationColumns() {
  return (
    <ul className="mt-8 grid grid-cols-1 border-t-2 border-slate-900 md:grid-cols-3">
      {SITUATIONS.map((s, i) => (
        <li key={s.title} className={`border-b border-border py-6 md:px-6 md:py-8 ${i > 0 ? "md:border-l" : ""} ${i === 0 ? "md:pl-0" : ""}`}>
          <div className="flex items-center gap-3">
            <ServiceIcon id={s.icon} />
            <h3 className="text-title-3 font-bold text-slate-900">{s.title}</h3>
          </div>
          <ul className="mt-4 flex flex-col">
            {s.links.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="flex items-center justify-between py-2.5 text-body-1 font-medium text-slate-800">
                  {l.label}
                  <ChevronRight className="size-4 text-slate-500" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
