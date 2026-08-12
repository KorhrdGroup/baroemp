/**
 * 실제 서비스 레이어(job-sync.service / job-search.service / job-actions.ts가 사용하는
 * 하위 서비스/Repository)를 통해
 * "Provider Sync -> jobs DB 저장 -> 검색 -> 조회/찜/지원클릭 -> Career Interest -> Lead 재계산"
 * 전체 STEP 4 Flow를 1회 실행하고 Supabase Mode에서 실제로 정상 동작하는지 검증한다.
 *
 * WORK24_API_KEY가 없으므로 MockJobProvider로 동작한다 (정상 - STEP4 요구사항).
 *
 * STEP 6 참고: job-actions.ts의 Server Action(trackJobViewedAction 등)은 이제
 * getCurrentUser()로 세션 쿠키(next/headers cookies())를 읽어 userId를 도출한다.
 * 이 스크립트는 Next.js 요청 컨텍스트 밖에서 실행되는 순수 Node 스크립트이므로
 * 쿠키 기반 세션을 만들 수 없다 - 그래서 Server Action을 직접 호출하지 않고,
 * 그 Action들이 내부적으로 호출하는 실제 서비스 함수(logActivityEvent/recordJobInterestSignal/
 * recalculateLeadScore/getJobBookmarkRepository)를 동일한 인자로 직접 호출해
 * "인증 경계 없이도 서비스/DB 레이어가 실제로 동작하는지"를 검증한다.
 * 인증 경계(Server Action이 실제로 클라이언트 userId를 무시하고 세션 userId만 신뢰하는지)는
 * npm run smoke:auth / npm run e2e:member-flow가 실제 로그인 세션으로 별도 검증한다.
 *
 * 실행: npx tsx --env-file-if-exists=.env.local scripts/e2e-job-flow.ts
 */
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { syncJobsFromProvider } from "@/services/job-sync.service";
import { searchJobs } from "@/services/job-search.service";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { recordJobInterestSignal } from "@/services/job-interest.service";
import { recalculateLeadScore } from "@/services/lead-score.service";
import { getJobInterestRepository, getJobBookmarkRepository, getJobRepository } from "@/lib/repositories";

async function main() {
  if (process.env.DATA_SOURCE_MODE !== "supabase") {
    console.error("DATA_SOURCE_MODE=supabase 가 아닙니다. .env.local을 확인하세요.");
    process.exit(1);
  }

  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Supabase Admin Client 생성 실패 (서비스 키 확인 필요)");
  const email = `e2e-job-${Date.now()}@baro.local`;
  let userId: string | undefined;
  let syncedJobId: string | undefined;

  try {
    console.log("▶ 실제 서비스 레이어를 통한 채용공고 Flow 검증 시작 (Supabase Mode)\n");

    // 0. 임시 회원 생성
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: "password123!",
      email_confirm: true,
    });
    if (createErr || !created.user) throw new Error(`임시 회원 생성 실패: ${createErr?.message}`);
    userId = created.user.id;
    // STEP 6부터 auth.users insert 시 handle_new_auth_user 트리거(0033)가 profiles를 이미 생성한다.
    const { error: profileErr } = await admin.from("profiles").update({ name: "E2E Job 테스트" }).eq("id", userId);
    if (profileErr) throw new Error(`profile 갱신 실패: ${profileErr.message}`);
    console.log(`  ✅ 0. 임시 회원 생성 — user_id=${userId} (profiles는 0033 트리거가 자동 생성)`);

    // 1. Job Sync (Mock Provider -> jobs 테이블)
    const summary = await syncJobsFromProvider({ triggeredBy: "e2e-test", maxPages: 2, pageSize: 20 });
    console.log(
      `  ✅ 1. syncJobsFromProvider() — provider=${summary.provider}, isMock=${summary.isMock}, ` +
        `fetched=${summary.fetchedCount}, new=${summary.newCount}, updated=${summary.updatedCount}`,
    );
    if (summary.fetchedCount === 0) throw new Error("Provider가 공고를 하나도 반환하지 않음");
    if (summary.errorCount > 0) throw new Error(`Sync 중 오류 발생 (errorCount=${summary.errorCount})`);

    // 2. 검색 (Job Search Service -> Supabase 실제 조회, 서버사이드 페이지네이션)
    const searchResult = await searchJobs({ activeOnly: true, page: 1, pageSize: 5, sort: "latest" });
    console.log(
      `  ✅ 2. searchJobs() — total=${searchResult.total}, items=${searchResult.items.length}, page=${searchResult.page}`,
    );
    if (searchResult.items.length === 0) throw new Error("검색 결과가 비어있음 (Sync 직후인데도 조회 안 됨)");
    syncedJobId = searchResult.items.find((j) => j.externalSource === "mock")?.id ?? searchResult.items[0].id;

    const job = await getJobRepository().findById(syncedJobId);
    if (!job) throw new Error("동기화된 공고를 다시 조회할 수 없음");

    // 3. 상세 조회 -> JOB_VIEWED + Career Interest + Lead 재계산 (trackJobViewedAction과 동일한 서비스 호출)
    await logActivityEvent({ userId, eventType: "job_detail_viewed", entityType: "job", entityId: job.id, metadata: { jobId: job.id } });
    await recordJobInterestSignal({ userId, job, signal: "JOB_VIEWED" });
    await recalculateLeadScore(userId);
    const interestsAfterView = await getJobInterestRepository().findAll({ userId });
    console.log(
      `  ✅ 3. JOB_VIEWED 처리 — user_job_interests(JOB_BEHAVIOR) 레코드 수=${interestsAfterView.filter((i) => i.source === "JOB_BEHAVIOR").length}`,
    );
    if (interestsAfterView.filter((i) => i.source === "JOB_BEHAVIOR").length === 0) {
      throw new Error("JOB_VIEWED 이후 user_job_interests(JOB_BEHAVIOR)가 생성되지 않음");
    }

    // 4. 찜 -> job_bookmarks 저장 확인 (toggleJobBookmarkAction과 동일한 서비스 호출)
    await getJobBookmarkRepository().add(userId, syncedJobId);
    await logActivityEvent({ userId, eventType: "job_bookmarked", entityType: "job", entityId: job.id, metadata: { jobId: job.id } });
    await recordJobInterestSignal({ userId, job, signal: "JOB_BOOKMARKED" });
    await recalculateLeadScore(userId);
    const bookmarks = await getJobBookmarkRepository().findAllByUser(userId);
    console.log(`  ✅ 4. 찜(add) 처리 — DB 저장 수=${bookmarks.length}`);
    if (!bookmarks.some((b) => b.jobId === syncedJobId)) throw new Error("job_bookmarks에 저장되지 않음");

    // 5. 지원클릭 -> Activity + Career Interest 반영 (trackJobApplyClickAction과 동일한 서비스 호출)
    await logActivityEvent({ userId, eventType: "job_apply_clicked", entityType: "job", entityId: job.id, metadata: { jobId: job.id } });
    await recordJobInterestSignal({ userId, job, signal: "JOB_APPLY_CLICKED" });
    await recalculateLeadScore(userId);
    console.log(`  ✅ 5. JOB_APPLY_CLICKED 처리 — 정상 처리됨`);

    // 6. Lead 확인
    const { data: lead } = await admin.from("leads").select("score, grade").eq("user_id", userId).maybeSingle();
    console.log(`  ✅ 6. Lead 재계산 확인 — score=${lead?.score}, grade=${lead?.grade}`);
    if (!lead) throw new Error("leads row가 생성되지 않음 (recalculateLeadScore 미동작)");

    console.log("\n모든 STEP 4 Job Flow 단계가 정상적으로 통과했습니다.");
  } finally {
    console.log("\n🧹 테스트 데이터 정리 중...");
    try {
      if (userId) {
        await admin.from("job_bookmarks").delete().eq("user_id", userId);
        await admin.from("user_job_interests").delete().eq("user_id", userId);
        await admin.from("activity_events").delete().eq("user_id", userId);
        await admin.from("leads").delete().eq("user_id", userId);
        await admin.from("career_profiles").delete().eq("user_id", userId);
        await admin.from("profiles").delete().eq("id", userId);
        await admin.auth.admin.deleteUser(userId);
      }
      // Mock Provider가 이번 실행에서 생성한 공고(externalSource=mock)는 다음 실행에서도 재사용 가능하므로
      // 굳이 지우지 않는다 (deactivateStale이 자연스럽게 관리한다). 필요 시 수동 정리.
    } catch (cleanupErr) {
      console.warn("정리 중 일부 실패(무시 가능):", cleanupErr);
    }
    console.log("   완료.\n");
  }
}

main().catch((err) => {
  console.error("\n❌ E2E Job Flow 검증 실패:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
