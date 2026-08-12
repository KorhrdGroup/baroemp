/**
 * 원격 Supabase DB의 현재 상태(테이블 존재 여부)를 점검한다.
 * Migration 적용 전 "이미 뭔가 적용되어 있는 상태인지"를 먼저 확인하기 위한 스크립트.
 * 실행: npx tsx scripts/check-remote-schema.ts
 */
import { getProjectInfo, runReadOnlyQuery } from "./supabase-management-api";

async function main() {
  const info = await getProjectInfo();
  console.log("프로젝트:", info.name, "| status:", info.status, "| region:", info.region);

  const result = await runReadOnlyQuery(
    "select table_name from information_schema.tables where table_schema = 'public' order by table_name;",
  );
  if (!result.ok) {
    console.error("스키마 조회 실패:", result.status, JSON.stringify(result.error));
    process.exit(1);
  }
  const tables = result.rows.map((r) => (r as { table_name: string }).table_name);
  console.log(`\npublic 스키마 테이블 개수: ${tables.length}`);
  if (tables.length > 0) {
    console.log(tables.join(", "));
  } else {
    console.log("(테이블 없음 — 완전히 빈 프로젝트)");
  }

  const migLog = await runReadOnlyQuery(
    "select table_name from information_schema.tables where table_schema = 'public' and table_name = '_migration_log';",
  );
  if (migLog.ok && migLog.rows.length > 0) {
    const applied = await runReadOnlyQuery("select filename, applied_at from public._migration_log order by filename;");
    if (applied.ok) {
      console.log("\n이미 적용 기록된 migration:");
      for (const row of applied.rows as Array<{ filename: string; applied_at: string }>) {
        console.log(`  - ${row.filename} (${row.applied_at})`);
      }
    }
  } else {
    console.log("\n_migration_log 테이블 없음 (아직 이 스크립트로 migration을 적용한 적 없음)");
  }
}

main().catch((err) => {
  console.error("오류:", err instanceof Error ? err.message : err);
  process.exit(1);
});
