/**
 * Occupation 카탈로그의 jobCategoryCode(워크넷 직종코드)를 채우는 매핑 스크립트.
 *
 * 배경: Work24 실공고 동기화 후 jobs.jobCategory는 워크넷 직종코드(예: 550102)인데,
 * occupations.jobCategoryCode가 비어 있으면 시장 통계·커리어갭·직업 연결이 전부 끊긴다.
 * 공통코드 API는 현재 키에 미신청 상태라, 채용공고 상세 API(callTp=D, infoSvc=VALIDATION)의
 * jobsNm("요양 보호사(550102)" 형태)으로 코드→직종명 표를 만들어 이름 매칭한다.
 *
 * 실행:  npx tsx --env-file-if-exists=.env.local scripts/map-occupation-codes.ts        (미리보기)
 *        npx tsx --env-file-if-exists=.env.local scripts/map-occupation-codes.ts --apply (DB 반영)
 */
import { getJobRepository, getOccupationRepository } from "@/lib/repositories";

const DETAIL_ENDPOINT = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210D01.do";

const normalize = (s: string) => s.replace(/\s|\(.*?\)/g, "");

async function fetchJobsName(authKey: string, wantedAuthNo: string): Promise<string | null> {
  const qs = new URLSearchParams({ authKey, callTp: "D", returnType: "XML", wantedAuthNo, infoSvc: "VALIDATION" });
  const res = await fetch(`${DETAIL_ENDPOINT}?${qs}`);
  if (!res.ok) return null;
  const xml = await res.text();
  const m = xml.match(/<jobsNm>([^<]+)<\/jobsNm>/);
  return m ? m[1].trim() : null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const authKey = process.env.WORK24_API_KEY?.trim();
  if (!authKey) throw new Error("WORK24_API_KEY가 없습니다.");

  const jobs = await getJobRepository().findAll({ activeOnly: true });
  const codeToSample = new Map<string, string>();
  const codeToCount = new Map<string, number>();
  for (const job of jobs) {
    if (!job.jobCategory) continue;
    codeToCount.set(job.jobCategory, (codeToCount.get(job.jobCategory) ?? 0) + 1);
    if (job.externalId && !codeToSample.has(job.jobCategory)) {
      codeToSample.set(job.jobCategory, job.externalId);
    }
  }
  console.log(`▶ 활성 공고 ${jobs.length}건, 직종코드 ${codeToSample.size}종 — 상세 API로 직종명 수집 중...`);

  const codeToName = new Map<string, string>();
  let done = 0;
  for (const [code, wantedAuthNo] of codeToSample) {
    const name = await fetchJobsName(authKey, wantedAuthNo);
    if (name) codeToName.set(code, name);
    done += 1;
    if (done % 50 === 0) console.log(`  ...${done}/${codeToSample.size}`);
    await new Promise((r) => setTimeout(r, 120));
  }
  console.log(`  직종명 수집 완료: ${codeToName.size}/${codeToSample.size}\n`);

  const occupations = await getOccupationRepository().findAll();
  const entries = [...codeToName.entries()];
  let matched = 0;
  const unmatched: string[] = [];

  for (const occ of occupations) {
    const occName = normalize(occ.name);
    // 이름이 겹치는 후보 중 "활성 공고가 가장 많은" 코드를 고른다.
    // (최단명 기준은 550100 같은 상위코드를 골라, 공고가 몰린 세부코드(550102 등)를 놓친다)
    const candidates = entries
      .filter(([, jobsNm]) => {
        const n = normalize(jobsNm);
        return n.includes(occName) || occName.includes(n);
      })
      .sort((a, b) => (codeToCount.get(b[0]) ?? 0) - (codeToCount.get(a[0]) ?? 0));

    if (candidates.length === 0) {
      unmatched.push(occ.name);
      continue;
    }
    const [code, jobsNm] = candidates[0];
    matched += 1;
    const already = occ.jobCategoryCode === code;
    console.log(
      `  ${already ? "=" : "✓"} ${occ.name} ← ${jobsNm} [${code}] 공고 ${codeToCount.get(code) ?? 0}건${candidates.length > 1 ? ` (후보 ${candidates.length}개 중 최다공고 선택)` : ""}`,
    );
    if (apply && !already) {
      await getOccupationRepository().update(occ.id, { jobCategoryCode: code });
    }
  }

  console.log(`\n매칭 ${matched}/${occupations.length}건${apply ? " — DB 반영 완료" : " (미리보기 — --apply로 반영)"}`);
  if (unmatched.length > 0) {
    console.log(`미매칭 ${unmatched.length}건 (현재 수집된 공고에 해당 직종 없음): ${unmatched.join(", ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
