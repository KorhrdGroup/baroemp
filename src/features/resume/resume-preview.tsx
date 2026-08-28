import type { ResumeDetail, ResumeSectionCode } from "@/types";

/**
 * A4 인쇄 기준 이력서 Preview (스펙 45번).
 * 그래픽/아이콘/컬러/퍼센트 스킬바 없이, 채용 담당자가 익숙한 단순 문서형 레이아웃만 사용한다.
 * 이 컴포넌트는 편집화면 미리보기와 인쇄(PDF Export) 양쪽에서 동일하게 재사용된다.
 */
const DEFAULT_SECTION_ORDER: ResumeSectionCode[] = [
  "BASIC_INFO",
  "SUMMARY",
  "EXPERIENCE",
  "EDUCATION",
  "QUALIFICATION",
  "TRAINING",
  "SKILLS",
  "PROJECT",
  "ACTIVITY",
];

/** 날짜는 문서 전체에서 YYYY.MM 으로 통일한다. 취득일에 일자까지는 필요 없다. */
function formatMonth(value?: string): string {
  return value ? value.slice(0, 7).replace("-", ".") : "";
}

function formatPeriod(start?: string, end?: string, isCurrent?: boolean): string {
  if (!start && !end) return "";
  const s = formatMonth(start);
  const e = isCurrent ? "재직중" : formatMonth(end);
  return [s, e].filter(Boolean).join(" ~ ");
}

/*
  인쇄용 문서의 글자 체계는 두 단만 쓴다.

    이름          title-3  굵게
    섹션 제목      label-1  굵게      (한 문서에서 이 크기는 섹션 제목뿐)
    항목 제목      label-2  semibold  (회사명 등)
    본문·보조      label-2  기본      (담당업무·요약·자격명, 기간은 흐리게)

  전에는 요약과 회사명만 label-1 이라 본문끼리 크기가 갈리고
  회사명이 섹션 제목과 같은 크기여서 무엇이 상위인지 읽히지 않았다.
*/
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 border-b border-slate-300 pb-1.5 text-label-1 font-bold tracking-wide text-slate-900">
      {children}
    </h2>
  );
}

export function ResumePreview({ detail }: { detail: ResumeDetail }) {
  const { resume, educations, experiences, qualifications, trainings, skills, items } = detail;
  const sectionOrder = detail.template?.sections?.length ? detail.template.sections : DEFAULT_SECTION_ORDER;

  const awards = items.filter((i) => i.sectionType === "AWARD");
  const projects = items.filter((i) => i.sectionType === "PROJECT");
  const activities = items.filter((i) => i.sectionType === "ACTIVITY" || i.sectionType === "VOLUNTEER");
  const languages = items.filter((i) => i.sectionType === "LANGUAGE");

  function renderSection(section: ResumeSectionCode) {
    switch (section) {
      case "BASIC_INFO":
        return (
          <div key={section} className="mb-8 border-b border-slate-300 pb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-title-3 font-bold text-slate-900">{resume.name || "이름 미입력"}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-label-2 text-slate-600">
                  <div>
                    <dt className="inline text-slate-400">이메일 </dt>
                    <dd className="inline">{resume.email || "-"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-400">전화번호 </dt>
                    <dd className="inline">{resume.phone || "-"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-400">거주지역 </dt>
                    <dd className="inline">{resume.address || "-"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-400">희망직무 </dt>
                    <dd className="inline">{resume.desiredJobTitle || "-"}</dd>
                  </div>
                </dl>
              </div>
              {resume.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resume.photoUrl} alt="증명사진" className="h-[110px] w-[85px] shrink-0 rounded object-cover ring-1 ring-slate-300" />
              )}
            </div>
          </div>
        );
      case "SUMMARY":
        if (!resume.summary) return null;
        return (
          <div key={section} className="mb-8">
            <SectionTitle>핵심 경력 / 한 줄 소개</SectionTitle>
            <p className="text-label-2 leading-relaxed text-slate-700">{resume.summary}</p>
          </div>
        );
      case "EXPERIENCE":
        if (experiences.length === 0) return null;
        return (
          <div key={section} className="mb-8">
            <SectionTitle>경력</SectionTitle>
            <div className="space-y-4">
              {experiences.map((exp) => (
                <div key={exp.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-label-2 font-semibold text-slate-900">
                      {exp.companyName}
                      {exp.position ? ` · ${exp.position}` : ""}
                      {exp.jobTitle ? ` (${exp.jobTitle})` : ""}
                    </p>
                    <p className="text-label-2 text-slate-500">{formatPeriod(exp.startDate, exp.endDate, exp.isCurrent)}</p>
                  </div>
                  {exp.responsibilities && (
                    <p className="mt-1 text-label-2 leading-relaxed text-slate-700">담당업무: {exp.responsibilities}</p>
                  )}
                  {exp.achievements && (
                    <p className="mt-1 text-label-2 leading-relaxed text-slate-700">주요성과: {exp.achievements}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      case "EDUCATION":
        if (educations.length === 0) return null;
        return (
          <div key={section} className="mb-8">
            <SectionTitle>학력</SectionTitle>
            <div className="space-y-4">
              {educations.map((edu) => (
                <div key={edu.id} className="flex flex-wrap items-baseline justify-between gap-2 text-label-2">
                  <p className="text-slate-800">
                    {/* 검정고시처럼 학교명이 없는 학력은 학교구분으로 표시한다. */}
                    {edu.schoolName || edu.educationType || ""}
                    {edu.major ? ` · ${edu.major}` : ""}
                    {edu.degree ? ` (${edu.degree})` : ""}
                    {/* 편입 등 부가 표기 (편집 화면의 편입 체크가 description="편입"으로 저장된다) */}
                    {edu.description ? ` · ${edu.description}` : ""}
                  </p>
                  <p className="text-slate-500">
                    {formatPeriod(edu.admissionDate, edu.graduationDate)} {edu.graduationStatus ?? ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      case "QUALIFICATION":
        if (qualifications.length === 0) return null;
        return (
          <div key={section} className="mb-8">
            <SectionTitle>보유 자격</SectionTitle>
            <div className="space-y-2 text-label-2 text-slate-800">
              {qualifications.map((q) => (
                <div key={q.id} className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>
                    {q.name}
                    {q.issuer ? ` (${q.issuer})` : ""}
                  </span>
                  <span className="text-slate-500">{formatMonth(q.acquiredAt)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case "TRAINING":
        if (trainings.length === 0) return null;
        return (
          <div key={section} className="mb-8">
            <SectionTitle>교육/훈련</SectionTitle>
            <div className="space-y-2 text-label-2 text-slate-800">
              {trainings.map((t) => (
                <div key={t.id} className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>
                    {t.courseName}
                    {t.institution ? ` (${t.institution})` : ""}
                  </span>
                  <span className="text-slate-500">{formatPeriod(t.startDate, t.endDate)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case "SKILLS":
        if (skills.length === 0) return null;
        return (
          <div key={section} className="mb-8">
            <SectionTitle>보유 스킬</SectionTitle>
            <p className="text-label-2 text-slate-800">{skills.map((s) => s.name).join(" · ")}</p>
          </div>
        );
      case "PROJECT":
        if (projects.length === 0) return null;
        return (
          <div key={section} className="mb-8">
            <SectionTitle>프로젝트</SectionTitle>
            <div className="space-y-2.5 text-label-2 text-slate-800">
              {projects.map((p) => (
                <div key={p.id}>
                  <p className="font-medium">
                    {p.title}
                    {p.organization ? ` · ${p.organization}` : ""}
                  </p>
                  {p.description && <p className="text-slate-600">{p.description}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      case "ACTIVITY":
        if (activities.length === 0 && awards.length === 0 && languages.length === 0) return null;
        return (
          <div key={section} className="mb-8">
            <SectionTitle>대외활동 / 수상 / 외국어</SectionTitle>
            <div className="space-y-2 text-label-2 text-slate-800">
              {[...activities, ...awards, ...languages].map((item) => (
                <div key={item.id} className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>
                    {item.title}
                    {item.organization ? ` · ${item.organization}` : ""}
                  </span>
                  <span className="text-slate-500">{item.description ?? ""}</span>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div id="resume-print-area" className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white p-8 text-slate-900 print:p-0">
      {sectionOrder.map((section) => renderSection(section))}
      {resume.portfolioUrl && (
        <p className="mt-4 text-label-2 text-slate-400">포트폴리오: {resume.portfolioUrl}</p>
      )}
    </div>
  );
}
