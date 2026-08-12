/**
 * Seed 데이터가 실제로 적재되었는지 테이블별 row count로 확인한다.
 * 실행: npx tsx scripts/check-seed-data.ts
 */
import { runReadOnlyQuery } from "./supabase-management-api";

const TABLES = [
  "profiles",
  "tags",
  "occupations",
  "qualifications",
  "contents",
  "content_recommendation_rules",
  "career_profiles",
  "user_acquisition",
  "leads",
  "activity_events",
  "assessments",
  "assessment_questions",
  "assessment_options",
  "jobs",
  "support_programs",
  "consultations",
  "match_results",
  "occupation_matching_rules",
];

async function main() {
  for (const table of TABLES) {
    const result = await runReadOnlyQuery(`select count(*)::int as count from public.${table};`);
    if (!result.ok) {
      console.log(`${table.padEnd(28)} 조회 실패: ${JSON.stringify(result.error)}`);
      continue;
    }
    const count = (result.rows[0] as { count: number }).count;
    console.log(`${table.padEnd(28)} ${count}건`);
  }

  const authUsers = await runReadOnlyQuery(
    "select count(*)::int as count from auth.users where email like '%@baro.local';",
  );
  if (authUsers.ok) {
    console.log(`${"auth.users (seed)".padEnd(28)} ${(authUsers.rows[0] as { count: number }).count}건`);
  }
}

main().catch((err) => {
  console.error("오류:", err instanceof Error ? err.message : err);
  process.exit(1);
});
