import type { CoverLetterDetail } from "@/types";

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

/**
 * 문서에 찍는 문항 제목.
 *
 * 편집 화면의 질문은 "지원 동기를 작성해주세요." 처럼 시키는 말이다. 쓰는 동안에는
 * 그게 맞지만 완성된 문서 제목으로는 어색하다. 종류별로 제목을 따로 둔다.
 *
 * 관리자가 직접 넣은 문항(CUSTOM)은 종류가 없으므로 질문에서 시키는 말꼬리만 뗀다.
 */
const QUESTION_HEADINGS: Record<string, string> = {
  MOTIVATION: "지원 동기",
  FIELD_INTEREST: "지원 분야에 관심을 갖게 된 계기",
  EXPERIENCE: "주요 경력",
  JOB_FIT: "직무 적합성",
  STRENGTH: "나의 강점",
  PROBLEM_SOLVING: "문제해결 경험",
  INTERPERSONAL: "대인관계 경험",
  CONFLICT_HANDLING: "갈등 대응 경험",
  RESPONSIBILITY: "책임감과 업무 태도",
  CONTRIBUTION: "기여할 수 있는 점",
  ASPIRATION: "입사 후 포부",
};

function sectionHeading(questionType: string, question: string): string {
  const preset = QUESTION_HEADINGS[questionType];
  if (preset) return preset;

  return (
    question
      .trim()
      .replace(/\s*(을|를|에 대해|에 대하여|에 관해|에 관하여)?\s*(작성|기술|서술)해\s*주세요[.!]?$/, "")
      .trim() || question
  );
}

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
    <div className="print-document mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white p-8 text-slate-900 print:p-0">
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
            {sectionHeading(section.questionType, section.question)}
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
