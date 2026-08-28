/**
 * 워크넷 직종코드 → 직종명 표(job_category_codes)를 채운다.
 *
 * 채용공고 목록 API는 직종코드만 주고 이름을 주지 않아, 관리자 통계에 624102 같은 숫자가 그대로 보인다.
 * 코드별로 대표 공고 1건을 골라 상세 API(callTp=D, infoSvc=VALIDATION)의 jobsNm에서 이름을 얻어 저장한다.
 * 이미 저장된 코드는 건너뛰므로 반복 실행해도 새 코드만 채운다.
 *
 * 실행: npm run sync:job-category-names
 */
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const DETAIL_ENDPOINT = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210D01.do";

/** "요양 보호사(550102)" 처럼 이름 뒤에 코드가 붙어 오므로 괄호 안 코드를 떼어낸다. */
function cleanName(raw: string): string {
  return raw.replace(/\s*\(\d{6}\)\s*$/, "").trim();
}

async function fetchJobsName(authKey: string, wantedAuthNo: string): Promise<string | null> {
  const qs = new URLSearchParams({
    authKey,
    callTp: "D",
    returnType: "XML",
    wantedAuthNo,
    infoSvc: "VALIDATION",
  });
  const res = await fetch(`${DETAIL_ENDPOINT}?${qs}`);
  if (!res.ok) return null;
  const xml = await res.text();
  const m = xml.match(/<jobsNm>([^<]+)<\/jobsNm>/);
  return m ? cleanName(m[1]) : null;
}

async function main() {
  const authKey = process.env.WORK24_API_KEY?.trim();
  if (!authKey) throw new Error("WORK24_API_KEY가 없습니다.");
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Supabase Admin Client 생성 실패");

  const { data: existingRows } = await admin.from("job_category_codes").select("code");
  const existing = new Set((existingRows ?? []).map((r: { code: string }) => r.code));

  // 6만+건을 select * 로 읽으면 statement timeout 이 난다. 필요한 두 컬럼만 페이지 단위로 훑는다.
  const codeToSample = new Map<string, string>();
  let scanned = 0;
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin
      .from("jobs")
      .select("job_category, external_id")
      .eq("is_active", true)
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`공고 조회 실패: ${error.message}`);
    const rows = (data ?? []) as { job_category: string | null; external_id: string | null }[];
    for (const r of rows) {
      const code = r.job_category;
      if (!code || existing.has(code) || codeToSample.has(code)) continue;
      if (r.external_id) codeToSample.set(code, r.external_id);
    }
    scanned += rows.length;
    if (rows.length < PAGE) break;
  }

  console.log(`▶ 활성 공고 ${scanned}건 / 저장된 코드 ${existing.size}개 / 새로 채울 코드 ${codeToSample.size}개\n`);
  if (codeToSample.size === 0) {
    console.log("새로 채울 코드가 없습니다.");
    return;
  }

  let done = 0;
  let saved = 0;
  for (const [code, wantedAuthNo] of codeToSample) {
    const name = await fetchJobsName(authKey, wantedAuthNo);
    if (name) {
      const { error } = await admin
        .from("job_category_codes")
        .upsert({ code, name, updated_at: new Date().toISOString() }, { onConflict: "code" });
      if (error) console.error(`  저장 실패 ${code}: ${error.message}`);
      else saved += 1;
    }
    done += 1;
    if (done % 50 === 0) console.log(`  ...${done}/${codeToSample.size}`);
    await new Promise((r) => setTimeout(r, 120));
  }

  console.log(`\n완료: ${saved}/${codeToSample.size}개 저장`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
