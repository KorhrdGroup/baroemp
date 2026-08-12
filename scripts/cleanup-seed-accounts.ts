/**
 * STEP 6 [36] 테스트/Seed 계정 정리 스크립트.
 *
 * 0015_seed.sql이 만든 seed01~20@baro.local 계정과, 각 e2e/smoke 스크립트가 실행마다 생성하는
 * `*@baro.local` 임시 계정을 식별한다. 기존 migration은 수정하지 않고(0015 그대로 유지),
 * 기존 DB 데이터도 임의로 삭제하지 않는다 — 기본 동작은 "목록만 출력"하는 dry-run이다.
 *
 * 실제 삭제가 필요할 때만(예: 운영 배포 직전) --delete 플래그를 명시적으로 넘긴다.
 * auth.users 삭제 시 profiles(on delete cascade) 이하 career_profiles/leads/activity_events 등이
 * 함께 정리된다 (0001/0002 등에서 이미 on delete cascade로 연결돼 있음).
 *
 * 실행:
 *   npx tsx --env-file-if-exists=.env.local scripts/cleanup-seed-accounts.ts            (목록만 출력)
 *   npx tsx --env-file-if-exists=.env.local scripts/cleanup-seed-accounts.ts --delete   (실제 삭제)
 */
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const TEST_EMAIL_SUFFIX = "@baro.local";

async function main() {
  if (process.env.DATA_SOURCE_MODE !== "supabase") {
    console.error("DATA_SOURCE_MODE=supabase 가 아닙니다. .env.local을 확인하세요.");
    process.exit(1);
  }

  const shouldDelete = process.argv.includes("--delete");
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Supabase Admin Client 생성 실패 (서비스 키 확인 필요)");

  const { data, error } = await admin
    .from("profiles")
    .select("id,email,name,created_at")
    .ilike("email", `%${TEST_EMAIL_SUFFIX}`)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`profiles 조회 실패: ${error.message}`);

  const rows = data ?? [];
  console.log(`▶ 테스트 계정(${TEST_EMAIL_SUFFIX}) ${rows.length}건 발견\n`);
  for (const row of rows) {
    console.log(`  - ${row.email} (${row.name ?? "이름없음"}) id=${row.id} created_at=${row.created_at}`);
  }

  if (rows.length === 0) {
    console.log("\n정리할 테스트 계정이 없습니다.");
    return;
  }

  if (!shouldDelete) {
    console.log(
      "\n[dry-run] 실제 삭제는 수행하지 않았습니다. 운영 배포 전 정리가 필요하면 --delete 플래그로 다시 실행하세요.",
    );
    console.log("주의: seed01~20@baro.local은 0015_seed.sql이 생성한 데모용 Career DB(관리자 화면 시연용)이므로,");
    console.log("      운영 오픈 이전에는 남겨두어도 무방하나 실제 운영 전에는 반드시 삭제해야 합니다.");
    return;
  }

  console.log("\n▶ --delete 지정됨. auth.users 삭제를 통해 cascade로 하위 데이터까지 정리합니다.\n");
  let deleted = 0;
  let failed = 0;
  for (const row of rows) {
    const { error: delErr } = await admin.auth.admin.deleteUser(row.id);
    if (delErr) {
      console.log(`  ❌ ${row.email} 삭제 실패: ${delErr.message}`);
      failed++;
      continue;
    }
    console.log(`  ✅ ${row.email} 삭제 완료`);
    deleted++;
  }
  console.log(`\n삭제 완료: ${deleted}건, 실패: ${failed}건`);
}

main().catch((err) => {
  console.error("\n❌ 정리 스크립트 실패:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
