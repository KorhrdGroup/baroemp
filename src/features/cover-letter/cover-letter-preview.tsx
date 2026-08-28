import type { CoverLetterDetail } from "@/types";

/**
 * A4 인쇄 기준 자기소개서 Preview.
 * 이력서 미리보기(ResumePreview)와 같은 문서 규칙을 쓴다 - 그래픽 없이 단순 문서형,
 * 편집화면 미리보기와 인쇄(PDF Export) 양쪽에서 같은 컴포넌트를 재사용한다.
 *
 * 글자 체계도 이력서와 같다.
 *   제목        title-3  굵게
 *   문항        label-1  굵게      (한 문서에서 이 크기는 문항 제목뿐)
 *   답변·보조   label-2  기본
 */
export function CoverLetterPreview({ detail }: { detail: CoverLetterDetail }) {
  const { coverLetter, sections, template } = detail;
  const ordered = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="print-document mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white p-8 text-slate-900 print:p-0">
      <div className="mb-8 border-b border-slate-300 pb-5">
        <p className="text-title-3 font-bold text-slate-900">
          {coverLetter.title?.trim() || "자기소개서"}
        </p>
        {template?.name && <p className="mt-2 text-label-2 text-slate-600">{template.name}</p>}
      </div>

      {ordered.map((section) => (
        <div key={section.id} className="mb-8">
          <h2 className="mb-3 border-b border-slate-300 pb-1.5 text-label-1 font-bold tracking-wide text-slate-900">
            {section.question}
          </h2>
          {section.content?.trim() ? (
            /* 문단 사이를 살려야 읽힌다. 답변은 줄바꿈을 그대로 두고 줄간격만 넉넉히 준다. */
            <p className="text-label-2 leading-relaxed whitespace-pre-wrap text-slate-700">
              {section.content}
            </p>
          ) : (
            <p className="text-label-2 text-slate-400">아직 작성하지 않은 문항입니다.</p>
          )}
        </div>
      ))}
    </div>
  );
}
