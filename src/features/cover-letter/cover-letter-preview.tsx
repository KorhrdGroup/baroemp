import type { CoverLetterDetail } from "@/types";
import { questionHeading } from "@/lib/cover-letter/questions";

/**
 * A4 인쇄 기준 자기소개서 Preview.
 * 이력서 미리보기(ResumePreview)와 같은 문서 규칙을 쓴다 - 그래픽 없이 단순 문서형,
 * 편집화면 미리보기와 인쇄(PDF Export) 양쪽에서 같은 컴포넌트를 재사용한다.
 *
 * 글자 체계도 이력서와 같다.
 *   제목        title-2  굵게      (24px)
 *   문항        body-2   굵게      (16px, 한 문서에서 이 크기는 문항 제목뿐)
 *   답변·보조   label-1  기본      (14px)
 */

export function CoverLetterPreview({
  detail,
  applicantName,
}: {
  detail: CoverLetterDetail;
  /** 문서에 찍는 지원자 이름. 연결된 이력서의 이름을 먼저 쓰고 없으면 계정 이름. */
  applicantName?: string;
}) {
  const { coverLetter, sections } = detail;
  const ordered = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="print-document mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white p-8 text-slate-900 print:min-h-0 print:p-[12mm]">
      {/*
        머리글에는 선을 두지 않는다. 아래 문항마다 밑줄이 있어 선이 겹치면
        문서가 표처럼 보인다. 제목과 이름은 크기 차이로 이미 구분된다.
      */}
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-title-2 font-bold text-slate-900">
          {coverLetter.title?.trim() || "자기소개서"}
        </p>
        {applicantName && <p className="text-body-2 font-semibold text-slate-700">{applicantName}</p>}
      </div>

      {ordered.map((section) => (
        <div key={section.id} className="mb-8">
          <h2 className="mb-3 border-b border-slate-300 pb-1.5 text-body-2 font-bold tracking-wide text-slate-900">
            {questionHeading(section.questionType, section.question)}
          </h2>
          {section.content?.trim() ? (
            /* 문단 사이를 살려야 읽힌다. 답변은 줄바꿈을 그대로 두고 줄간격만 넉넉히 준다. */
            <p className="text-label-1 leading-relaxed whitespace-pre-wrap text-slate-700">
              {section.content}
            </p>
          ) : (
            <p className="text-label-1 text-slate-400">아직 작성하지 않은 문항입니다.</p>
          )}
        </div>
      ))}
    </div>
  );
}
