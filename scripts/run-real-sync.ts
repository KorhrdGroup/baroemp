/**
 * STEP 5.5 [6] 실제 Supabase Sync 1회 실행 스크립트.
 * PublicServiceSupportProvider로 실제 API 데이터를 support_programs에 동기화한다.
 *
 * 실행: npx tsx --env-file-if-exists=.env.local scripts/run-real-sync.ts
 */
import { syncSupportProgramsFromProvider } from "@/services/support-sync.service";
import { resolveActiveSupportProviderName } from "@/features/support/providers";

async function main() {
  console.log(`▶ 활성 Support Provider: ${resolveActiveSupportProviderName()}`);
  const maxPages = Number(process.argv[2] ?? 5);
  const pageSize = Number(process.argv[3] ?? 100);
  console.log(`▶ Sync 시작 (maxPages=${maxPages}, pageSize=${pageSize})...\n`);

  const started = Date.now();
  const summary = await syncSupportProgramsFromProvider({ triggeredBy: "step5.5-manual", maxPages, pageSize });
  const elapsed = Date.now() - started;

  console.log(JSON.stringify(summary, null, 2));
  console.log(`\n소요 시간: ${elapsed}ms`);
}

main().catch((err) => {
  console.error("Sync 실패:", err);
  process.exitCode = 1;
});
