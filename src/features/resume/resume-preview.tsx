import type { Region, ResumeDetail, ResumeSectionCode } from "@/types";
import { formatPhone } from "@/lib/utils/phone";
import { labelRegion } from "@/lib/labels";

/** 만 나이. 생일이 아직 안 지났으면 한 살 뺀다. */
function koreanAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
}

/** "라벨 | 값" 연락처 줄. 라벨 폭을 맞추고 얇은 세로선으로 나눈다. */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    // h-full + items-center: 옆 칸 값이 두 줄로 접혀 행이 높아져도(긴 주소 등)
    // 같은 행의 짧은 항목이 위에 붙지 않고 세로 가운데에 선다.
    <div className="flex h-full items-center">
      <dt className="w-16 shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 border-l border-slate-200 pl-3 break-keep text-slate-600">{value}</dd>
    </div>
  );
}

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

    이름          title-2  굵게      (24px)
    섹션 제목      body-2   굵게      (16px, 한 문서에서 이 크기는 섹션 제목뿐)
    항목 제목      label-1  semibold  (14px, 회사명 등)
    본문·보조      label-1  기본      (14px, 담당업무·요약·자격명, 기간은 흐리게)

  인쇄물이라 화면 목록보다 한 단계 크게 잡는다. 두 장이 되어도 읽히는 쪽이 낫다.

  전에는 요약과 회사명만 label-1 이라 본문끼리 크기가 갈리고
  회사명이 섹션 제목과 같은 크기여서 무엇이 상위인지 읽히지 않았다.
*/
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 border-b border-slate-300 pb-1.5 text-body-2 font-bold tracking-wide text-slate-900">
      {children}
    </h2>
  );
}

export function ResumePreview({ detail }: { detail: ResumeDetail }) {
  const { resume, educations, experiences, qualifications, trainings, skills, items } = detail;
  /*
    문서에 싣는 항목은 편집 화면이 보여주는 항목과 같아야 한다. 여기서 따로 정하면
    "뺐는데 인쇄물에는 나온다"가 된다. 고른 항목도 양식도 없을 때만 기본 순서를 쓴다.
  */
  const sectionOrder = detail.resume.sectionCodes?.length
    ? detail.resume.sectionCodes
    : detail.template?.sections?.length
      ? detail.template.sections
      : DEFAULT_SECTION_ORDER;

  const awards = items.filter((i) => i.sectionType === "AWARD");
  const projects = items.filter((i) => i.sectionType === "PROJECT");
  const activities = items.filter((i) => i.sectionType === "ACTIVITY" || i.sectionType === "VOLUNTEER");
  const languages = items.filter((i) => i.sectionType === "LANGUAGE");

  function renderSection(section: ResumeSectionCode) {
    switch (section) {
      case "BASIC_INFO":
        return (
          <div key={section} className="mb-8 border-b border-slate-300 pb-6">
            {/*
              구인 사이트 이력서 헤더 관례를 따른다: 사진 왼쪽, 이름 줄에 성별·출생연도·만 나이,
              아래에 "라벨 | 값" 형식의 연락처 줄. 채용 담당자가 눈에 익은 배치다.
            */}
            <div className="flex items-start gap-6">
              {resume.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resume.photoUrl} alt="증명사진" className="h-[150px] w-[118px] shrink-0 rounded object-cover ring-1 ring-slate-300" />
              )}
              <div className="min-w-0 flex-1 pt-1">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-title-2 font-bold text-slate-900">{resume.name || "이름 미입력"}</span>
                  {resume.gender && <span className="text-body-2 text-slate-500">{resume.gender === "male" ? "남" : "여"}</span>}
                  {resume.birthDate && (
                    <span className="text-body-2 text-slate-500">
                      {resume.birthDate.slice(0, 4)}년 (만 {koreanAge(resume.birthDate)}세)
                    </span>
                  )}
                </p>
                <dl className="mt-4 grid gap-y-2.5 text-body-2 sm:grid-cols-2 sm:gap-x-10">
                  <InfoRow label="휴대폰" value={formatPhone(resume.phone)} />
                  <InfoRow label="희망직무" value={resume.desiredJobTitle || "-"} />
                  <InfoRow label="성별" value={resume.gender ? (resume.gender === "male" ? "남" : "여") : "-"} />
                  <InfoRow label="희망지역" value={resume.desiredRegion ? labelRegion(resume.desiredRegion as Region) : "-"} />
                  {/* 주소·이메일은 길어서 반 칸에 넣으면 두 줄로 접힌다. 한 줄 전체를 쓴다. */}
                  <div className="sm:col-span-2">
                    <InfoRow label="주소" value={[resume.address, resume.addressDetail].filter(Boolean).join(" ") || "-"} />
                  </div>
                  <div className="sm:col-span-2">
                    <InfoRow label="이메일" value={resume.email || "-"} />
                  </div>
                </dl>
              </div>
            </div>
          </div>
        );
      case "SUMMARY":
        if (!resume.summary) return null;
        return (
          <div key={section} className="mb-8">
            <SectionTitle>한 줄 소개</SectionTitle>
            <p className="text-label-1 leading-relaxed text-slate-700">{resume.summary}</p>
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
                    <p className="text-label-1 font-semibold text-slate-900">
                      {exp.companyName}
                      {exp.position ? ` · ${exp.position}` : ""}
                      {exp.jobTitle ? ` (${exp.jobTitle})` : ""}
                    </p>
                    <p className="text-label-1 text-slate-500">{formatPeriod(exp.startDate, exp.endDate, exp.isCurrent)}</p>
                  </div>
                  {exp.responsibilities && (
                    <p className="mt-1 text-label-1 leading-relaxed text-slate-700">담당업무: {exp.responsibilities}</p>
                  )}
                  {exp.achievements && (
                    <p className="mt-1 text-label-1 leading-relaxed text-slate-700">주요성과: {exp.achievements}</p>
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
                <div key={edu.id} className="flex flex-wrap items-baseline justify-between gap-2 text-label-1">
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
            <div className="space-y-2 text-label-1 text-slate-800">
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
            <div className="space-y-2 text-label-1 text-slate-800">
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
            <p className="text-label-1 text-slate-800">{skills.map((s) => s.name).join(" · ")}</p>
          </div>
        );
      case "PROJECT":
        if (projects.length === 0) return null;
        return (
          <div key={section} className="mb-8">
            <SectionTitle>프로젝트</SectionTitle>
            <div className="space-y-2.5 text-label-1 text-slate-800">
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
            <div className="space-y-2 text-label-1 text-slate-800">
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
    <div id="resume-print-area" className="print-document mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white p-8 text-slate-900 print:min-h-0 print:p-[12mm]">
      {sectionOrder.map((section) => renderSection(section))}
      {resume.portfolioUrl && (
        <p className="mt-4 text-label-1 text-slate-400">포트폴리오: {resume.portfolioUrl}</p>
      )}
    </div>
  );
}
