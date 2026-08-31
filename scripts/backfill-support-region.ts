/**
 * 지역이 비어 있는 지원제도에 기초 자치단체 이름으로 지역을 채운다.
 *
 * 원본 파서가 광역 키워드만 훑던 시절에 들어온 행들이라, "용산구시설관리공단" 처럼
 * 광역 이름 없이 기초 이름만 있는 기관은 지역이 비어 있다. 화면에서는 안 보이지만
 * 매칭에서 지역 조건이 통째로 빠져, 다른 지역 회원에게도 그대로 노출된다.
 *
 * 이미 값이 있는 행은 건드리지 않는다. 새로 들어오는 데이터는 파서가 같은 사전을 쓴다.
 *
 * 실행: npx tsx --env-file-if-exists=.env.local scripts/backfill-support-region.ts [--apply]
 */
import { createClient } from "@supabase/supabase-js";
import { guessRegionFromSigungu } from "../src/lib/regions/sigungu";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요하다.");
const supabase = createClient(url, key, { auth: { persistSession: false } });

interface Row {
  id: string;
  organization: string | null;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const rows: Row[] = [];
  // Supabase 는 한 번에 1,000행까지 준다. 끝까지 훑는다.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("support_programs")
      .select("id, organization")
      .is("region_scope", null)
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < 1000) break;
  }
  console.log(`지역이 빈 지원제도 ${rows.length}건`);

  const byRegion = new Map<string, string[]>();
  for (const row of rows) {
    const region = guessRegionFromSigungu(row.organization ?? "");
    if (!region) continue;
    const ids = byRegion.get(region) ?? [];
    ids.push(row.id);
    byRegion.set(region, ids);
  }

  const total = [...byRegion.values()].reduce((sum, ids) => sum + ids.length, 0);
  for (const [region, ids] of [...byRegion.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${region}: ${ids.length}건`);
  }
  console.log(`채울 수 있는 것 ${total}건 / 남는 것 ${rows.length - total}건`);

  if (!apply) {
    console.log("\n--apply 를 붙이면 실제로 채운다.");
    return;
  }

  for (const [region, ids] of byRegion) {
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase
        .from("support_programs")
        .update({ region_scope: region })
        .in("id", ids.slice(i, i + 200))
        .is("region_scope", null);
      if (error) throw error;
    }
    console.log(`  ${region} ${ids.length}건 채움`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
