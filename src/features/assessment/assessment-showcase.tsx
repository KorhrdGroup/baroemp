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
  isLoggedIn,
}: {
  data: OccupationShowcase;
  isLoggedIn: boolean;
}) {
  const { start, dialog } = useStartAssessment(isLoggedIn);
  return (
    <>
      <DiagnosisShowcase
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
