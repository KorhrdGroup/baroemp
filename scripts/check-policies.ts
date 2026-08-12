import { runReadOnlyQuery } from "./supabase-management-api";

async function main() {
  const tables = process.argv.slice(2);
  const filter = tables.length > 0 ? `and tablename in (${tables.map((t) => `'${t}'`).join(",")})` : "";
  const result = await runReadOnlyQuery(`
    select tablename, policyname, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = 'public' ${filter}
    order by tablename, policyname;
  `);
  if (!result.ok) {
    console.error("조회 실패:", JSON.stringify(result.error));
    process.exit(1);
  }
  for (const row of result.rows as Array<Record<string, unknown>>) {
    console.log(JSON.stringify(row, null, 2));
  }
}

main();
