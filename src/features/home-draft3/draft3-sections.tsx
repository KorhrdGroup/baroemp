import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { QUALIFICATIONS } from "@/features/home-draft/qualification-section";
import { labelRegion } from "@/lib/labels";
import type { Region, SupportProgram } from "@/types";

/*
  /draft3 전용 조각. /draft2 의 같은 조각은 테두리 상자 안에 담겨 있어, 상자가 겹겹이 쌓이면 서류 양식처럼 딱딱해졌다.
  여기서는 테두리를 걷고 여백과 가는 구분선만으로 나눈다.
*/

/** 구역 제목. 머리말(파랑, 작게) → 제목(24px · 700). 머리말과 크기 차이를 줄여 덜 쾅쾅 찍히게. */
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
        <p className="text-body-3 font-bold text-atomic-blue-600">{eyebrow}</p>
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

/** 자격증으로 찾기. 상자 없이 제목 + 바탕색만 있는 글자 단추. */
export function Draft3QualificationLinks() {
  return (
    <div>
      <h3 className="border-b border-slate-300 pb-3 text-body-1 font-bold text-slate-900">자격증으로 찾기</h3>
      <ul className="mt-4 flex flex-wrap gap-2">
        {QUALIFICATIONS.map((name) => (
          <li key={name}>
            <Link
              href={`/jobs?keyword=${encodeURIComponent(name)}`}
              className="block rounded-lg bg-gov-surface px-3.5 py-2 text-body-3 font-semibold text-slate-800"
            >
              {name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
