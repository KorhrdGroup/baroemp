"use client";

import { DiagnosisShowcase } from "@/components/layout/diagnosis-showcase";
import type { OccupationShowcase } from "@/services/occupation-showcase.service";
import { useStartAssessment } from "./start-assessment-button";

/* "(우대)"가 붙은 자격만 있으면 없어도 지원할 수 있는 직업. */
function qualificationNote(qualifications: string[]) {
  if (qualifications.length === 0) return { text: "자격 없이 시작 가능", tone: "ready" as const };
  const required = qualifications.filter((q) => !q.includes("우대"));
  if (required.length === 0) return { text: `우대 자격 · ${qualifications[0].replace(/\(우대\)/, "")}`, tone: "ready" as const };
  return { text: `필요 자격 · ${required[0]}`, tone: "prepare" as const };
}

/** 직업진단 소개의 "직업 모음" 구역. 카드를 누르면 시작 단추와 같은 동작으로 진단을 시작한다. */
export function AssessmentShowcase({
  data,
  asOf,
  isLoggedIn,
}: {
  data: OccupationShowcase;
  asOf: string;
  isLoggedIn: boolean;
}) {
  const { start, dialog } = useStartAssessment(isLoggedIn);
  return (
    <>
      <DiagnosisShowcase
        eyebrow="직업 모음"
        title={
          <>
            이 중 <span className="text-baro-blue">나에게 맞는 직업</span>을
            <br />
            진단으로 골라드려요
          </>
        }
        asOf={asOf}
        count={data.totalCount}
        unit="개"
        note="아래는 분야별 예시예요. 경력 · 성향 · 희망 조건에 따라 잘 맞는 직업이 달라요."
        listTitle={
          <>
            분야별 <strong className="font-extrabold text-baro-blue">직업 예시</strong>
          </>
        }
        tabs={data.groups.map((g) => ({
          key: g.key,
          label: g.label,
          cards: g.occupations.map((o) => ({
            id: o.id,
            title: o.name,
            body: o.description,
            footnote: qualificationNote(o.qualifications),
          })),
        }))}
        onStart={() => void start()}
      />
      {dialog}
    </>
  );
}
