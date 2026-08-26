/**
 * gov24 지원제도 전량 동기화 (약 11,000건).
 * 실행: npx tsx scripts/run-support-full-sync.ts
 * Vercel 서버리스는 실행시간 제한이 있어 전량 동기화는 로컬에서 돌린다 (DB는 운영과 동일).
 */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i).trim()] ??= line.slice(i + 1).trim();
}

async function main() {
  const { syncSupportProgramsFromProvider } = await import("../src/services/support-sync.service");
  const started = Date.now();
  const summary = await syncSupportProgramsFromProvider({ triggeredBy: "full-sync-script" });
  console.log(JSON.stringify(summary, null, 2));
  console.log(`소요: ${Math.round((Date.now() - started) / 1000)}초`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
