import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SUPPORT_HIGHLIGHTS } from "@/features/home-draft/support-highlights-data";
import { resolveOrganizationLogo } from "@/lib/support/organization-logo";
import { LearningCardIllustration } from "./learning-card-illustration";

/* 큰 카드로 세울 제도. 가장 많이 찾고 금액이 눈에 띄는 것. */
const LEAD_ID = "support-002";

/**
 * /draft3 지원금 구역. 한 구역 안에서 카드와 목록을 섞는다(벤토) -
 * 왼쪽 큰 카드 한 장에 대표 제도를 크게, 오른쪽에 나머지를 얇은 선 목록으로.
 * /draft 는 카드 여섯 장, /draft2 는 표 한 장이라 이 둘의 가운데.
 * 목록 금액은 핵심(숫자 · 전액 · 무료)만 파랗게, 꾸밈말(최대 · 교육비 · /년)은 검정으로 둬 파랑이 줄마다 덩어리지지 않게. 큰 카드 바탕은 회색.
 */
export function SupportBento() {
  const lead = SUPPORT_HIGHLIGHTS.find((s) => s.id === LEAD_ID) ?? SUPPORT_HIGHLIGHTS[0];
  const rest = SUPPORT_HIGHLIGHTS.filter((s) => s.id !== lead.id);
  const leadLogo = resolveOrganizationLogo(lead.org);

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* 대표 카드는 위 · 아래 두 칸으로 나눈다.
          위 칸: 기관 · 제목 · 설명 · 금액을 왼쪽에 한 덩어리로 모으고, 배움카드 그림은 오른쪽 아래로 내려 아래 칸 경계선 · 오른쪽 끝에서 잘리게 둔다(책 아랫부분이 경계선 밑으로 들어간 느낌).
          아래 칸: 신청 기간 · 지역 · 자세히를 진한 파랑 띠 한 줄로(흰 글자) - 그림이 글을 덮지 않는다. 좁은 휴대폰에서는 그림을 뺀다. */}
      <Link href="/support" className="flex flex-col overflow-hidden rounded-card bg-baro-blue-50 lg:col-span-5">
        <div className="relative flex-1 overflow-hidden p-6 sm:p-8">
          <LearningCardIllustration className="pointer-events-none absolute -right-10 -bottom-7 hidden w-[21rem] sm:block" />
          <div className="relative">
            {leadLogo ? (
              <Image src={leadLogo} alt={lead.org} width={128} height={32} className="h-8 w-auto" />
            ) : (
              <p className="text-body-3 font-semibold text-slate-700">{lead.org}</p>
            )}
            <p className="mt-4 text-title-2 font-extrabold tracking-[-0.02em] text-slate-900">{lead.title}</p>
            <p className="mt-2 text-body-2 font-medium break-keep text-slate-700">{lead.summary}</p>
            <p className="mt-6 text-headline-3 font-extrabold tracking-[-0.02em] text-atomic-blue-600">{lead.amount}</p>
          </div>
        </div>
        <div className="relative flex items-center justify-between gap-4 bg-baro-blue px-6 py-4 sm:px-8">
          <dl className="flex gap-6 text-body-3">
            <div>
              <dt className="font-medium text-white/75">신청 기간</dt>
              <dd className="mt-0.5 font-semibold text-white">{lead.period}</dd>
            </div>
            <div>
              <dt className="font-medium text-white/75">지역</dt>
              <dd className="mt-0.5 font-semibold text-white">{lead.region}</dd>
            </div>
          </dl>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-body-2 font-semibold text-white">
            자세히
            <ChevronRight className="size-4" aria-hidden />
          </span>
        </div>
      </Link>

      <ul className="divide-y divide-border border-y border-slate-300 lg:col-span-7 lg:ml-4">
        {/* 줄마다 차례로 아래에서 떠오른다. 구역 전체를 감싼 Reveal(group)의 data-reveal 을 따라간다. */}
        {rest.map((item, i) => (
          <li
            key={item.id}
            className="transition-[opacity,translate] duration-500 ease-out group-data-[reveal=hidden]:translate-y-6 group-data-[reveal=hidden]:opacity-0"
            style={{ transitionDelay: `${150 + i * 90}ms` }}
          >
            <Link href="/support" className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="truncate text-body-1 font-semibold text-slate-800">{item.title}</p>
                <p className="mt-1 text-body-3 font-medium text-slate-600">
                  {item.org} · {item.region}
                </p>
              </div>
              <p className="shrink-0 text-body-1 font-bold text-slate-900">
                <AmountText amount={item.amount} />
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* 금액 글에서 핵심만 파랗게: "최대 195만원" → 195만원, "교육비 전액" → 전액, "무료 상담" → 무료. 꾸밈말은 검정 그대로. */
const KEY_PART = /(\d[\d,]*만원|전액|무료)/;

function AmountText({ amount }: { amount: string }) {
  const [before, key, after] = amount.split(KEY_PART);
  if (key === undefined) return amount;
  return (
    <>
      {before}
      <span className="text-atomic-blue-600">{key}</span>
      {after}
    </>
  );
}
