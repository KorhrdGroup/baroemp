/**
 * 채용공고 Provider Sync 수동 실행 스크립트.
 * WORK24_API_KEY가 설정돼 있으면 Work24(워크넷) 실 API에서, 없으면 MockJobProvider에서 가져온다.
 *
 * 실행: npm run sync:jobs
 * (내부: tsx --env-file-if-exists=.env.local scripts/sync-jobs.ts)
 * 옵션: JOB_SYNC_MAX_PAGES / JOB_SYNC_PAGE_SIZE 환경변수로 페이지 수 조정
 */
import { syncJobsFromProvider } from "@/services/job-sync.service";
import { getJobRepository } from "@/lib/repositories";

async function main() {
  console.log("▶ 채용공고 동기화 시작\n");

  const summary = await syncJobsFromProvider({ triggeredBy: "manual-script" });

  console.log(`  provider   : ${summary.provider} (mock=${summary.isMock})`);
  console.log(`  fetched    : ${summary.fetchedCount}`);
  console.log(`  new        : ${summary.newCount}`);
  console.log(`  updated    : ${summary.updatedCount}`);
  console.log(`  duplicate  : ${summary.duplicateCount}`);
  console.log(`  deactivated: ${summary.deactivatedCount}`);
  console.log(`  errors     : ${summary.errorCount}`);
  if (summary.errorMessage) console.log(`  error      : ${summary.errorMessage}`);

  const jobs = await getJobRepository().findAll({ activeOnly: true });
  console.log(`\n  현재 활성 공고 ${jobs.length}건. 샘플:`);
  for (const job of jobs.slice(0, 5)) {
    console.log(`   - [${job.jobCategory}] ${job.title} / ${job.companyName ?? ""}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
