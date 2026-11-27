import Link from "next/link";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPORT_ELIGIBILITY_GRADE_LABELS } from "@/types";
import type { SupportEligibilityGrade } from "@/types";

/* 등급 숫자 색. 카드 배지(grade-badge) · 거르기 알약과 같은 등급 색. */
const GRADE_NUMBER_CLASS: Partial<Record<SupportEligibilityGrade, string>> = {
  HIGH: "text-emerald-700",
  MEDIUM: "text-brand-blue-700",
  CHECK_REQUIRED: "text-orange-700",
};
const SHOWN_GRADES: SupportEligibilityGrade[] = ["HIGH", "MEDIUM", "CHECK_REQUIRED"];

/**
 * 지원금 진단 결과의 머리. 경기 잡아바 지원사업 소개 판처럼 남색 판 하나에(밝은 파랑은 화면에서 너무 튀어 남색으로)
 * 왼쪽은 해시태그(찾은 분야) · 결과 문장 · 기준 한 줄 · 안내, 오른쪽은 등급별 개수를 흰 동그라미로.
 * 위치 줄은 판 위 회색 띠에 둔다.
 */
export function SupportResultHero({
  title,
  tags,
  totalCount,
  gradeCounts,
}: {
  title: string;
  /** 찾은 지원제도의 분야 이름(교육 · 훈련 등). 앞의 몇 개만 해시태그로. */
  tags: string[];
  totalCount: number;
  gradeCounts: Record<SupportEligibilityGrade, number>;
}) {
  const shown = SHOWN_GRADES.filter((g) => gradeCounts[g] > 0);
  return (
    <div className="mx-auto max-w-7xl px-4.5 pt-6 sm:pt-8 lg:px-8">
      <nav aria-label="현재 위치">
        <ol className="flex flex-wrap items-center gap-1 text-body-3 font-medium text-slate-600">
          <li><Link href="/">홈</Link></li>
          <li className="flex items-center gap-1">
            <ChevronRight aria-hidden className="size-3.5 text-slate-500" />
            <Link href="/support">지원금 찾기</Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight aria-hidden className="size-3.5 text-slate-500" />
            <span aria-current="page" className="text-slate-900">진단 결과</span>
          </li>
        </ol>
      </nav>

      <section className="mt-4 flex flex-col gap-8 rounded-card bg-baro-navy px-6 py-8 sm:px-10 sm:py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="min-w-0">
          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {tags.slice(0, 3).map((t, i) => (
                <li
                  key={t}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-body-3 font-semibold",
                    /* 남색 판 위라 둘째부터는 남색 알약 대신 반투명 흰 알약(남색끼리 겹치면 안 보인다). */
                    i === 0 ? "bg-white text-baro-blue-600" : "bg-white/20 text-white",
                  )}
                >
                  #{t.replace(/\s/g, "")}
                </li>
              ))}
            </ul>
          )}
          <h1 className="mt-4 text-title-2 leading-[1.35] font-extrabold tracking-[-0.02em] break-keep text-white sm:text-title-1">
            {title}
          </h1>
          {totalCount > 0 && (
            <p className="mt-2.5 flex items-start gap-1.5 text-body-2 font-semibold text-baro-blue-100">
              <ClipboardCheck aria-hidden className="mt-0.5 size-4.5 shrink-0" />
              입력하신 조건으로 지원제도 {totalCount}개를 살펴봤어요
            </p>
          )}
          <p className="mt-5 max-w-2xl text-body-2 leading-relaxed font-medium break-keep text-white/90">
            입력하신 조건 기준의 참고 정보로, 최종 신청 가능 여부는 각 운영기관에서 확인해야 합니다.
          </p>
        </div>

        {shown.length > 0 && (
          <ul className="flex shrink-0 gap-3 sm:gap-6" aria-label="가능성별 개수">
            {shown.map((g) => (
              <li key={g} className="flex flex-col items-center">
                <span className="flex size-20 items-center justify-center rounded-full bg-white sm:size-24">
                  <span className={cn("text-title-1 font-extrabold sm:text-headline-3", GRADE_NUMBER_CLASS[g])}>
                    {gradeCounts[g]}
                  </span>
                </span>
                <span className="mt-2.5 text-body-2 font-semibold whitespace-nowrap text-white">
                  {SUPPORT_ELIGIBILITY_GRADE_LABELS[g]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
