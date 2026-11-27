import Link from "next/link";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/features/home-draft3/count-up";
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
 * 지원금 진단 결과의 머리. 마이페이지 "다음 할 일" 판과 같은 밝은 하늘색 판 하나에
 * 왼쪽은 해시태그(찾은 분야) · 결과 문장 · 기준 한 줄 · 안내, 오른쪽은 등급별 개수를 흰 동그라미로.
 * 동그라미는 들어올 때 하나씩 톡 떠오르고(globals.css .sr-pop) 숫자는 0부터 올라간다. 움직임 줄이기면 둘 다 멈춘다.
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

      <section className="mt-4 flex flex-col gap-8 rounded-card bg-[linear-gradient(115deg,#EEF4FF_0%,#D6E5FF_55%,#B9D2FF_100%)] px-6 py-8 sm:px-10 sm:py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="min-w-0">
          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {tags.slice(0, 3).map((t, i) => (
                <li
                  key={t}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-body-3 font-semibold",
                    /* 첫째는 흰 알약에 파란 글자, 둘째부터는 반투명 흰 알약에 회색 글자로 한 단계 눅인다. */
                    i === 0 ? "bg-white text-baro-blue-600" : "bg-white/60 text-slate-700",
                  )}
                >
                  #{t.replace(/\s/g, "")}
                </li>
              ))}
            </ul>
          )}
          <h1 className="mt-4 text-title-2 leading-[1.35] font-extrabold tracking-[-0.02em] break-keep text-baro-navy sm:text-title-1">
            {title}
          </h1>
          {totalCount > 0 && (
            <p className="mt-2.5 flex items-start gap-1.5 text-body-2 font-semibold text-baro-blue-600">
              <ClipboardCheck aria-hidden className="mt-0.5 size-4.5 shrink-0" />
              입력하신 조건으로 지원제도 {totalCount}개를 살펴봤어요
            </p>
          )}
          <p className="mt-5 max-w-2xl text-body-2 leading-relaxed font-medium break-keep text-slate-700">
            입력하신 조건 기준의 참고 정보로, 최종 신청 가능 여부는 각 운영기관에서 확인해야 해요.
          </p>
        </div>

        {shown.length > 0 && (
          <ul className="flex shrink-0 gap-3 sm:gap-6" aria-label="가능성별 개수">
            {shown.map((g, i) => (
              <li key={g} className="sr-pop flex flex-col items-center" style={{ ["--sr-i" as string]: i }}>
                <span className="flex size-20 items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(37,83,180,0.14)] sm:size-24">
                  <CountUp
                    value={gradeCounts[g]}
                    className={cn("text-title-1 font-extrabold sm:text-headline-3", GRADE_NUMBER_CLASS[g])}
                  />
                </span>
                <span className="mt-2.5 text-body-2 font-semibold whitespace-nowrap text-slate-700">
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
