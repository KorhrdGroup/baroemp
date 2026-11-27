"use client";

import { DiagnosisShowcase } from "@/components/layout/diagnosis-showcase";
import type { SupportShowcase } from "@/services/support-search.service";

/** 지원금 찾기 소개의 "지원제도 모음" 구역. 틀은 직업진단과 같은 DiagnosisShowcase. */
export function SupportShowcaseSection({
  data,
  onStart,
}: {
  data: SupportShowcase;
  /** 카드를 누르면 상세로 보내지 않고 진단을 시작한다(시작 단추와 같은 동작). 예시를 보고 "내게 맞나?"로 잇는다. */
  onStart: () => void;
}) {
  return (
    <DiagnosisShowcase
      listTitle="분야별 지원제도 예시"
      tabs={data.categories.map((c) => ({
        key: c.category,
        label: c.label,
        cards: c.programs.map((p) => ({
          id: p.id,
          title: p.title,
          sub: p.organization,
          highlight: p.supportAmountText || undefined,
          body: p.summary,
        })),
      }))}
      onStart={onStart}
    />
  );
}
