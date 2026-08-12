/**
 * STEP 5.5 [2],[3] 실제 API Connectivity Test + 3개 공식 Endpoint 응답 분석.
 *
 * 행정안전부_대한민국 공공서비스(혜택) 정보 OPEN API(공공데이터포털, api.odcloud.kr)를
 * 소량 호출하여 인증/네트워크/응답 구조를 점검한다. 인증키 전체 값은 절대 로그에 출력하지 않는다.
 *
 * 실행: npx tsx --env-file-if-exists=.env.local scripts/test-public-service-api.ts
 */

const BASE_URL = "https://api.odcloud.kr/api";

function maskKey(key: string): string {
  if (key.length <= 8) return "*".repeat(key.length);
  return `${key.slice(0, 4)}...${key.slice(-4)} (len=${key.length})`;
}

async function callEndpoint(path: string, params: Record<string, string>, apiKey: string) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  console.log(`\n▶ 요청: GET ${path}`);
  console.log(`   query: ${JSON.stringify(params)}`);

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Infuser ${apiKey}`,
        Accept: "application/json",
      },
    });
  } catch (err) {
    console.log(`   ❌ 네트워크 오류 (fetch 자체 실패): ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
  const elapsed = Date.now() - started;

  const contentType = res.headers.get("content-type");
  console.log(`   HTTP status: ${res.status} ${res.statusText} (${elapsed}ms)`);
  console.log(`   Content-Type: ${contentType}`);

  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    console.log(`   ⚠️  JSON 파싱 실패. 원문(최대 500자): ${text.slice(0, 500)}`);
    return { status: res.status, json: null, raw: text };
  }

  return { status: res.status, json, raw: text };
}

function printFullRecord(label: string, obj: unknown) {
  console.log(`\n===== ${label}: 전체 필드 =====`);
  console.log(JSON.stringify(obj, null, 2));
}

async function main() {
  const apiKey = process.env.PUBLIC_SERVICE_API_KEY?.trim();
  console.log("▶ STEP 5.5 실제 Public Service API Connectivity Test 시작\n");

  if (!apiKey) {
    console.log("❌ PUBLIC_SERVICE_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요.");
    process.exit(1);
  }
  console.log(`  PUBLIC_SERVICE_API_KEY 인식됨: ${maskKey(apiKey)}`);
  console.log(`  SUPPORT_PROVIDER=${process.env.SUPPORT_PROVIDER ?? "(미설정)"}`);

  // 1) serviceList 소량 호출 (전체 필드 확인 위해 1건만)
  const listResult = await callEndpoint("/gov24/v3/serviceList", { page: "1", perPage: "1" }, apiKey);
  if (!listResult) {
    console.log("\n❌ serviceList 호출 자체가 실패했습니다 (네트워크 계층).");
    process.exit(1);
  }
  if (listResult.status < 200 || listResult.status >= 300) {
    console.log(`\n❌ serviceList 실패 status=${listResult.status}, body=${listResult.raw?.slice(0, 500)}`);
    process.exit(1);
  }
  const listJson = listResult.json as Record<string, unknown>;
  console.log(`\n✅ serviceList 성공. 최상위 키: [${Object.keys(listJson).join(", ")}]`);
  for (const k of ["currentCount", "matchCount", "page", "perPage", "totalCount"]) {
    if (k in listJson) console.log(`   ${k}: ${JSON.stringify(listJson[k])}`);
  }
  const rows = (listJson.data as Record<string, unknown>[]) ?? [];
  if (rows.length > 0) {
    printFullRecord("serviceList data[0]", rows[0]);
  }

  // 서비스 ID 후보 필드 탐색
  const first = rows[0] ?? {};
  const svcIdKey = Object.keys(first).find((k) => k.includes("서비스ID") || k.toLowerCase().includes("servid"));
  const svcId = svcIdKey ? String(first[svcIdKey]) : undefined;
  console.log(`\n▶ 식별자 필드 추정: key="${svcIdKey}" value="${svcId}"`);

  // 2) 여러 건 요청해서 페이지네이션 구조 확인 (perPage=5)
  const listResult2 = await callEndpoint("/gov24/v3/serviceList", { page: "1", perPage: "5" }, apiKey);
  if (listResult2 && listResult2.status >= 200 && listResult2.status < 300) {
    const j2 = listResult2.json as Record<string, unknown>;
    console.log(`\n✅ serviceList(perPage=5) 성공. currentCount=${j2.currentCount}, matchCount=${j2.matchCount}, totalCount=${j2.totalCount}`);
    const rows2 = (j2.data as Record<string, unknown>[]) ?? [];
    console.log(`   실제 반환 건수: ${rows2.length}`);
    rows2.forEach((r, i) => {
      const svcKey = Object.keys(r).find((k) => k.includes("서비스ID"));
      const nameKey = Object.keys(r).find((k) => k.includes("서비스명"));
      console.log(`   [${i}] ${svcKey ? r[svcKey] : "?"} / ${nameKey ? r[nameKey] : "?"}`);
    });
  }

  if (!svcId) {
    console.log("\n⚠️ 서비스 ID를 찾지 못해 serviceDetail/supportConditions 테스트를 건너뜁니다.");
    return;
  }

  // 3) serviceDetail 호출 - 다양한 조건 파라미터 형태 시도
  console.log(`\n\n========== serviceDetail 테스트 (서비스ID=${svcId}) ==========`);
  const detailAttempts: Array<Record<string, string>> = [
    { "cond[서비스ID::EQ]": svcId },
    { 서비스ID: svcId },
  ];
  for (const params of detailAttempts) {
    const r = await callEndpoint("/gov24/v3/serviceDetail", params, apiKey);
    if (r) {
      console.log(`   status=${r.status}`);
      if (r.status >= 200 && r.status < 300 && r.json) {
        const j = r.json as Record<string, unknown>;
        console.log(`   최상위 키: [${Object.keys(j).join(", ")}]`);
        const d = (j.data as Record<string, unknown>[]) ?? [];
        if (d.length > 0) {
          printFullRecord(`serviceDetail data[0] (params=${JSON.stringify(params)})`, d[0]);
          break;
        } else {
          console.log(`   data 비어있음. raw(500): ${r.raw?.slice(0, 500)}`);
        }
      } else {
        console.log(`   실패 raw(500): ${r.raw?.slice(0, 500)}`);
      }
    }
  }

  // 4) supportConditions 호출
  console.log(`\n\n========== supportConditions 테스트 (서비스ID=${svcId}) ==========`);
  for (const params of detailAttempts) {
    const r = await callEndpoint("/gov24/v3/supportConditions", params, apiKey);
    if (r) {
      console.log(`   status=${r.status}`);
      if (r.status >= 200 && r.status < 300 && r.json) {
        const j = r.json as Record<string, unknown>;
        console.log(`   최상위 키: [${Object.keys(j).join(", ")}]`);
        const d = (j.data as Record<string, unknown>[]) ?? [];
        if (d.length > 0) {
          printFullRecord(`supportConditions data[0] (params=${JSON.stringify(params)})`, d[0]);
          break;
        } else {
          console.log(`   data 비어있음. raw(500): ${r.raw?.slice(0, 500)}`);
        }
      } else {
        console.log(`   실패 raw(500): ${r.raw?.slice(0, 500)}`);
      }
    }
  }

  console.log("\n\n✅ Connectivity Test 완료");
}

main().catch((err) => {
  console.error("\n예상치 못한 오류:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
