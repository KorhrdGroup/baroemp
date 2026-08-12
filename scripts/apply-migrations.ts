/**
 * supabase/migrations/*.sql 을 Supabase Management API로 순서대로 원격 DB에 적용한다.
 * (Docker/Supabase CLI의 DB Password 기반 연결을 쓸 수 없는 환경 전용 대안)
 *
 * - 각 migration 파일은 BEGIN/COMMIT으로 감싸 파일 단위 원자성을 보장한다
 *   (파일 중간에서 실패하면 그 파일 안에서 이미 실행된 부분도 롤백된다).
 * - public._migration_log 테이블에 적용 완료된 파일명을 기록하고,
 *   이미 기록된 파일은 재실행하지 않는다 (재실행 시 안전하게 이어서 진행 가능).
 * - 실패 시 즉시 중단하고, 실패한 파일명 + SQL 오류 메시지를 그대로 출력한다.
 *   (기존 migration 파일을 임의로 수정/삭제하거나 DB를 reset 하지 않는다.)
 *
 * 실행: npm run migrate:remote
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { runWriteQuery } from "./supabase-management-api";

const MIGRATIONS_DIR = resolve(__dirname, "../supabase/migrations");

async function ensureMigrationLogTable() {
  const result = await runWriteQuery(`
    create table if not exists public._migration_log (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);
  if (!result.ok) {
    throw new Error(`_migration_log 테이블 생성 실패: ${JSON.stringify(result.error)}`);
  }
}

async function getAppliedFiles(): Promise<Set<string>> {
  const result = await runWriteQuery("select filename from public._migration_log;");
  if (!result.ok) throw new Error(`적용 이력 조회 실패: ${JSON.stringify(result.error)}`);
  return new Set((result.rows as Array<{ filename: string }>).map((r) => r.filename));
}

async function main() {
  console.log("▶ Migration 적용 시작 (Supabase Management API)\n");

  await ensureMigrationLogTable();
  const applied = await getAppliedFiles();

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`총 ${files.length}개 migration 파일 발견. 이미 적용됨: ${applied.size}개.\n`);

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  ⏭  ${file} — 이미 적용됨, 스킵`);
      continue;
    }

    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
    const escapedFilename = file.replace(/'/g, "''");
    const wrapped = [
      "begin;",
      sql,
      `insert into public._migration_log (filename) values ('${escapedFilename}');`,
      "commit;",
    ].join("\n\n");

    process.stdout.write(`  ▶ ${file} 적용 중...`);
    const result = await runWriteQuery(wrapped);

    if (!result.ok) {
      console.log(" ❌ 실패\n");
      console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.error(`실패한 migration: ${file}`);
      console.error(`HTTP status: ${result.status}`);
      console.error(`오류 내용:`);
      console.error(JSON.stringify(result.error, null, 2));
      console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.error(
        "\n이 migration 파일은 BEGIN/COMMIT으로 감싸 실행했으므로, 실패 시 이 파일 안에서 실행된 내용은 전부 롤백되었습니다.",
      );
      console.error("기존 migration 파일을 수정하지 말고, 원인을 확인한 뒤 새 migration 파일로 해결하세요.");
      process.exitCode = 1;
      return;
    }

    console.log(" ✅ 완료");
  }

  console.log("\n모든 신규 migration 적용이 완료되었습니다.");
}

main().catch((err) => {
  console.error("\n예상치 못한 오류:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
