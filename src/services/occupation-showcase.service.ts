import { getOccupationRepository } from "@/lib/repositories";
import type { Occupation } from "@/types";

export interface OccupationShowcaseCard {
  id: string;
  name: string;
  description: string;
  /** 필요/우대 자격 원문. 비어 있으면 자격 없이 시작할 수 있는 직업. */
  qualifications: string[];
}

export interface OccupationShowcase {
  /** 진단에서 추천할 수 있는(게시된) 직업 수. */
  totalCount: number;
  groups: { key: string; label: string; occupations: OccupationShowcaseCard[] }[];
}

/* 직업 분류(occupations.category)를 탭 네 개로 묶는다. 목록에 없는 분류는 개수에만 들어간다. */
const GROUPS: { key: string; label: string; categories: string[] }[] = [
  { key: "care", label: "돌봄·복지", categories: ["돌봄", "복지"] },
  { key: "edu", label: "교육·상담", categories: ["교육", "상담"] },
  { key: "facility", label: "시설·운전", categories: ["시설", "운전"] },
  { key: "office", label: "사무·서비스", categories: ["사무", "서비스"] },
];

/**
 * /assessment 소개 화면의 "직업 모음" 구역. 읽기만 한다.
 * 게시된 직업만 쓴다 - 예전 코드형 분류(care_worker 등)의 active 행은 설명이 비어 있어 보여 주지 않는다.
 */
export async function getOccupationShowcase(): Promise<OccupationShowcase> {
  const published = (await getOccupationRepository().findAll()).filter((o: Occupation) => o.status === "published");
  return {
    totalCount: published.length,
    groups: GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      occupations: published
        .filter((o) => o.category && g.categories.includes(o.category))
        .slice(0, 8)
        .map((o) => ({ id: o.id, name: o.name, description: o.description, qualifications: o.requiredQualifications })),
    })).filter((g) => g.occupations.length > 0),
  };
}
