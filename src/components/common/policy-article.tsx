import type { ReactNode } from "react";
import { PageHead } from "@/components/layout/page-head";

/** 약관/방침 페이지 공용 레이아웃. 조문(제N조) 구조의 긴 문서를 읽기 좋게 표시한다. */
export function PolicyArticle({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}) {
  return (
    // 흰 머리 아래 회색 바탕에 흰 카드(테두리 · 그림자 없음). /draft3 색 구성 (globals.css .draft3-theme).
    <div className="draft3-theme">
      <PageHead crumbs={[{ label: title }]} title={title} description={`시행일자: ${effectiveDate}`} />
      <div className="bg-baro-page">
      <div className="mx-auto max-w-3xl px-4.5 pt-10 pb-20 lg:px-8">
        <div className="space-y-7 rounded-card bg-white p-6 text-body-2 leading-7 font-medium break-keep text-slate-700 sm:p-10 [&_h2]:text-body-1 [&_h2]:font-extrabold [&_h2]:text-slate-900 [&_h2]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
      </div>
      </div>
    </div>
  );
}

export function Article({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2>{heading}</h2>
      {children}
    </section>
  );
}
