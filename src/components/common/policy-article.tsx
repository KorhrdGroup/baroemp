import type { ReactNode } from "react";

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
    <div className="mx-auto max-w-3xl px-4.5 py-12 lg:px-8">
      <h1 className="text-title-2 font-bold text-slate-900 sm:text-headline-3">{title}</h1>
      <p className="mt-2 text-label-1 text-slate-400">시행일자: {effectiveDate}</p>
      <div className="mt-8 space-y-7 text-body-2 leading-7 text-slate-600 [&_h2]:text-body-1 [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
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
