import Link from "next/link";
import { QualificationIcon } from "./service-icons";

/**
 * 자격증에서 출발하는 입구. 중장년 구직자는 직종 이름보다 "내가 가진 자격증"으로 찾는 편이 쉽다.
 * 지금은 일자리찾기 키워드 검색으로 보낸다.
 */
export const QUALIFICATIONS = ["요양보호사", "사회복지사", "조리사", "간호조무사", "지게차", "전기기사"];

export function QualificationSection() {
  return (
    <section className="mx-auto mt-12 max-w-7xl px-4.5 sm:mt-16 lg:px-8">
      <h2 className="text-title-3 font-bold tracking-tight text-slate-900 sm:text-title-1">자격증으로 찾기</h2>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {QUALIFICATIONS.map((name) => (
          <Link
            key={name}
            href={`/jobs?keyword=${encodeURIComponent(name)}`}
            className="group flex items-center gap-3 rounded-xl border border-border bg-white p-4 lg:flex-col lg:items-start lg:p-5"
          >
            <QualificationIcon name={name} />
            <span className="min-w-0 text-body-2 font-semibold text-slate-900 sm:text-body-1 lg:mt-1">{name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
