/**
 * 신규 직업/성향 차원 검증 스크립트 (일회성).
 * 실행: npx tsx scripts/test-occupation-matching.ts
 * 서로 다른 성향 점수(페르소나)로 실제 matchOccupations 엔진을 돌려
 * 답변에 따라 추천 직업이 달라지는지 확인한다.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { matchOccupations } from "../src/features/assessment-engine/occupation-matcher";
import type { Occupation, OccupationMatchingRule } from "../src/types";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function mapOccupation(row: Record<string, unknown>): Occupation {
  return {
    id: String(row.id),
    name: String(row.name),
    category: (row.category as string) ?? undefined,
    description: (row.description as string) ?? "",
    isMidcareerFriendly: Boolean(row.is_midcareer_friendly),
    status: row.status as Occupation["status"],
    tags: (row.tags as string[]) ?? [],
    relatedContentIds: (row.related_content_ids as string[]) ?? [],
    requiredQualifications: (row.required_qualifications as string[]) ?? [],
    recommendedAgeGroups: (row.recommended_age_groups as Occupation["recommendedAgeGroups"]) ?? [],
    preferredEmploymentTypes: (row.preferred_employment_types as Occupation["preferredEmploymentTypes"]) ?? [],
    preferredRegions: (row.preferred_regions as Occupation["preferredRegions"]) ?? [],
    jobCategoryCode: (row.job_category_code as string) ?? undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  } as Occupation;
}

async function main() {
  const { data: occRows } = await client.from("occupations").select("*").eq("status", "published");
  const { data: ruleRows } = await client.from("occupation_matching_rules").select("*");
  const occupations = (occRows ?? []).map(mapOccupation);
  const rulesByOccupation = new Map<string, OccupationMatchingRule[]>();
  for (const r of ruleRows ?? []) {
    const rule: OccupationMatchingRule = {
      id: String(r.id),
      occupationId: String(r.occupation_id),
      dimension: String(r.dimension),
      targetValue: Number(r.target_value),
      weight: Number(r.weight),
      isRequired: Boolean(r.is_required),
    } as OccupationMatchingRule;
    const list = rulesByOccupation.get(rule.occupationId) ?? [];
    list.push(rule);
    rulesByOccupation.set(rule.occupationId, list);
  }
  console.log(`직업 ${occupations.length}종 / 규칙 ${(ruleRows ?? []).length}건 로드`);

  // 점수는 0~100 스케일 (문항 1~5점 → ×20)
  const personas: Record<string, Record<string, number>> = {
    "A. 가르침형 (아이 지도 5점)": {
      teaching_orientation: 100, people_interaction: 80, care_orientation: 80,
      administrative_skill: 60, education_willingness: 90, aesthetic_skill: 20,
      physical_activity: 60, stress_response: 70, teamwork: 80,
    },
    "B. 손기술형 (꾸미기 5점)": {
      aesthetic_skill: 100, people_interaction: 80, physical_activity: 80,
      teaching_orientation: 20, care_orientation: 40, schedule_flexibility: 70,
      administrative_skill: 40, education_willingness: 70,
    },
    "C. 돌봄형 (어르신 돌봄 5점)": {
      care_orientation: 100, people_interaction: 80, physical_activity: 80,
      teaching_orientation: 40, aesthetic_skill: 20, administrative_skill: 40,
      education_willingness: 80, stress_response: 60,
    },
    "D. 사무형 (행정·컴퓨터 높음)": {
      administrative_skill: 100, computer_skill: 80, people_interaction: 40,
      teaching_orientation: 20, aesthetic_skill: 20, care_orientation: 30,
      education_willingness: 80,
    },
  };

  for (const [label, dimensionScores] of Object.entries(personas)) {
    const recs = matchOccupations(
      { occupations, rulesByOccupation, dimensionScores, profile: {}, answerTags: [], contents: [] },
      5,
    );
    console.log(`\n${label}`);
    recs.forEach((r, i) => console.log(`  ${i + 1}위 ${r.occupationName} (${r.totalScore}점, ${r.grade})`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
