/**
 * 실제 서비스 레이어(support-sync.service / support-search.service / support-assessment.service가
 * support-actions.ts를 통해 실제로 호출하는 하위 서비스/Repository)를 통해
 * STEP 5 "지원금 찾기" 전체 Flow를 1회 실행하고 Supabase Mode에서 실제로 정상 동작하는지 검증한다.
 *
 * 검증 범위 (스펙 33번):
 *   지원금 검사 시작 -> 조건 입력 -> 결과 -> Match 저장 -> 상세조회 -> 찜 -> 공식신청 클릭
 *   -> Activity -> Career Profile -> Tags -> Lead 재계산 -> Admin 반영(DB 직접 확인)
 *
 * STEP 5.5: 이 스크립트는 항상 MockSupportProvider로만 동작하도록 강제한다
 * (.env.local에 SUPPORT_PROVIDER=public_service / PUBLIC_SERVICE_API_KEY가 설정돼 있어도
 * 무시한다). 실 API 장애가 이 회귀 테스트에 영향을 주지 않게 하기 위함이며,
 * 실 API 전용 검증은 scripts/e2e-support-flow-public.ts (npm run e2e:support:public)에서 별도로 수행한다.
 *
 * STEP 6 참고: support-actions.ts의 Server Action들은 이제 getCurrentUser()로 세션 쿠키를 읽어
 * userId를 도출한다. 이 스크립트는 Next.js 요청 컨텍스트 밖의 순수 Node 스크립트라 쿠키 세션을
 * 만들 수 없으므로, Server Action이 아니라 그 Action들이 내부적으로 호출하는 실제 서비스 함수를
 * 동일한 인자로 직접 호출해 서비스/DB 레이어를 검증한다 (e2e-job-flow.ts와 동일한 정책).
 * 인증 경계 자체는 npm run smoke:auth / npm run e2e:member-flow가 별도로 검증한다.
 *
 * 실행: npx tsx --env-file-if-exists=.env.local scripts/e2e-support-flow.ts
 */
process.env.SUPPORT_PROVIDER = "mock";
delete process.env.PUBLIC_SERVICE_API_KEY;

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { syncSupportProgramsFromProvider } from "@/services/support-sync.service";
import { searchSupportPrograms } from "@/services/support-search.service";
import { getSupportResultView } from "@/services/support-search.service";
import {
  startSupportAssessment,
  saveSupportAssessmentAnswers,
  completeSupportAssessment,
} from "@/services/support-assessment.service";
import { promoteSupportInterestTags } from "@/services/support-interest.service";
import { recalculateLeadScore } from "@/services/lead-score.service";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { getSupportBookmarkRepository, getSupportProgramRepository } from "@/lib/repositories";

async function main() {
  if (process.env.DATA_SOURCE_MODE !== "supabase") {
    console.error("DATA_SOURCE_MODE=supabase 가 아닙니다. .env.local을 확인하세요.");
    process.exit(1);
  }

  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Supabase Admin Client 생성 실패 (서비스 키 확인 필요)");
  const email = `e2e-support-${Date.now()}@baro.local`;
  let userId: string | undefined;
  let sessionId: string | undefined;
  let matchedProgramId: string | undefined;

  try {
    console.log("▶ 실제 서비스 레이어를 통한 지원금 찾기 Flow 검증 시작 (Supabase Mode)\n");

    // 0. 임시 회원 생성
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: "password123!",
      email_confirm: true,
    });
    if (createErr || !created.user) throw new Error(`임시 회원 생성 실패: ${createErr?.message}`);
    userId = created.user.id;
    // STEP 6부터 auth.users insert 시 handle_new_auth_user 트리거(0033)가 profiles를 이미 생성한다.
    const { error: profileErr } = await admin.from("profiles").update({ name: "E2E Support 테스트" }).eq("id", userId);
    if (profileErr) throw new Error(`profile 갱신 실패: ${profileErr.message}`);
    console.log(`  ✅ 0. 임시 회원 생성 — user_id=${userId} (profiles는 0033 트리거가 자동 생성)`);

    // 1. Support Sync (Mock Provider -> support_programs 테이블)
    const summary = await syncSupportProgramsFromProvider({ triggeredBy: "e2e-test", maxPages: 2, pageSize: 20 });
    console.log(
      `  ✅ 1. syncSupportProgramsFromProvider() — provider=${summary.provider}, isMock=${summary.isMock}, ` +
        `fetched=${summary.fetchedCount}, new=${summary.newCount}, updated=${summary.updatedCount}`,
    );
    if (summary.fetchedCount === 0) throw new Error("Provider가 지원제도를 하나도 반환하지 않음");
    if (summary.errorCount > 0) throw new Error(`Sync 중 오류 발생 (errorCount=${summary.errorCount})`);

    // 2. 검색 (Support Search Service -> Supabase 실제 조회, 서버사이드 페이지네이션)
    const searchResult = await searchSupportPrograms({ activeOnly: true, page: 1, pageSize: 5, sort: "latest" });
    console.log(
      `  ✅ 2. searchSupportPrograms() — total=${searchResult.total}, items=${searchResult.items.length}, page=${searchResult.page}`,
    );
    if (searchResult.items.length === 0) throw new Error("검색 결과가 비어있음 (Sync 직후인데도 조회 안 됨)");

    // 3. 지원금 진단 제출 (시작 -> 답변 저장 -> 완료 -> Match 저장 -> Career Profile 반영 -> Activity)
    // submitSupportAssessmentAction과 동일한 순서로 하위 서비스를 직접 호출한다.
    const session = await startSupportAssessment({ userId });
    await saveSupportAssessmentAnswers(session.id, {
      ageGroup: "50s",
      region: "seoul",
      employmentStatus: "career_break",
      desiredStartTiming: "within_3_months",
      trainingWillingness: 5,
      heldQualifications: [],
      desiredJobCategories: ["care_worker"],
      careerBreak: true,
      careerBreakMonths: 18,
    });
    const completion = await completeSupportAssessment(session.id);
    await recalculateLeadScore(userId);
    sessionId = session.id;
    const submitResult = {
      highCount: completion?.highCount ?? 0,
      checkRequiredCount: completion?.checkRequiredCount ?? 0,
      totalCount: completion?.matches.length ?? 0,
    };
    console.log(
      `  ✅ 3. 지원금 진단 제출 처리 — sessionId=${sessionId}, high=${submitResult.highCount}, ` +
        `checkRequired=${submitResult.checkRequiredCount}, total=${submitResult.totalCount}`,
    );
    if (submitResult.totalCount === 0) throw new Error("매칭된 지원제도가 하나도 없음");

    // 4. 결과 페이지 뷰 모델 (match_results target_type=support_program 조회)
    const resultView = await getSupportResultView(sessionId);
    if (!resultView) throw new Error("getSupportResultView()가 null을 반환함");
    console.log(
      `  ✅ 4. getSupportResultView() — totalCount=${resultView.totalCount}, categories=${resultView.categories.length}, ` +
        `HIGH=${resultView.gradeCounts.HIGH}, MEDIUM=${resultView.gradeCounts.MEDIUM}, ` +
        `CHECK_REQUIRED=${resultView.gradeCounts.CHECK_REQUIRED}, LOW=${resultView.gradeCounts.LOW}`,
    );
    matchedProgramId = resultView.categories[0]?.items[0]?.program.id;
    if (!matchedProgramId) throw new Error("결과에 프로그램이 하나도 없음");

    const { data: matchRows } = await admin
      .from("match_results")
      .select("id, target_type, grade, detail")
      .eq("source_id", userId)
      .eq("target_type", "support_program");
    if (!matchRows || matchRows.length === 0) throw new Error("match_results(target_type=support_program)가 저장되지 않음");
    console.log(`  ✅ 4-1. match_results 저장 확인 — rows=${matchRows.length}, detail 컬럼 포함=${Boolean(matchRows[0]?.detail)}`);

    // 5. Career Profile 반영 확인 (STEP3 merge 정책 재사용 - 무조건 덮어쓰기 금지)
    const { data: careerProfile } = await admin
      .from("career_profiles")
      .select("employment_status, preferred_region, career_break_months")
      .eq("user_id", userId)
      .maybeSingle();
    console.log(
      `  ✅ 5. Career Profile 반영 확인 — employment_status=${careerProfile?.employment_status}, ` +
        `preferred_region=${careerProfile?.preferred_region}, career_break_months=${careerProfile?.career_break_months}`,
    );
    if (!careerProfile) throw new Error("지원금 진단 완료 후 career_profiles가 생성되지 않음");

    const matchedProgram = await getSupportProgramRepository().findById(matchedProgramId);
    if (!matchedProgram) throw new Error("매칭된 지원제도를 다시 조회할 수 없음");

    // 6. 상세 조회 -> SUPPORT_VIEWED + Support Interest Tag 승격 + Lead 재계산 (trackSupportViewedAction과 동일한 서비스 호출)
    await logActivityEvent({
      userId,
      eventType: "support_viewed",
      entityType: "support_program",
      entityId: matchedProgram.id,
      metadata: { supportProgramId: matchedProgram.id, matchScore: 80, eligibilityGrade: "HIGH" },
    });
    await promoteSupportInterestTags(userId, matchedProgram);
    await recalculateLeadScore(userId);
    const { data: viewEvents } = await admin
      .from("activity_events")
      .select("id")
      .eq("user_id", userId)
      .eq("event_type", "support_viewed");
    console.log(`  ✅ 6. SUPPORT_VIEWED 처리 — activity_events(support_viewed) 저장 수=${viewEvents?.length ?? 0}`);
    if (!viewEvents || viewEvents.length === 0) throw new Error("SUPPORT_VIEWED activity_event가 저장되지 않음");

    // 7. 찜 -> support_bookmarks 저장 확인 (toggleSupportBookmarkAction과 동일한 서비스 호출)
    await getSupportBookmarkRepository().add(userId, matchedProgramId);
    await logActivityEvent({
      userId,
      eventType: "support_bookmarked",
      entityType: "support_program",
      entityId: matchedProgram.id,
      metadata: { supportProgramId: matchedProgram.id },
    });
    await recalculateLeadScore(userId);
    const bookmarks = await getSupportBookmarkRepository().findAllByUser(userId);
    console.log(`  ✅ 7. 찜(add) 처리 — DB 저장 수=${bookmarks.length}`);
    if (!bookmarks.some((b) => b.supportProgramId === matchedProgramId)) throw new Error("support_bookmarks에 저장되지 않음");

    // 8. 공식 신청페이지 클릭 -> Activity + Lead 재계산 (trackSupportApplyClickAction과 동일한 서비스 호출)
    await logActivityEvent({
      userId,
      eventType: "support_apply_clicked",
      entityType: "support_program",
      entityId: matchedProgram.id,
      metadata: { supportProgramId: matchedProgram.id },
    });
    await recalculateLeadScore(userId);
    const { data: applyEvents } = await admin
      .from("activity_events")
      .select("id")
      .eq("user_id", userId)
      .eq("event_type", "support_apply_clicked");
    console.log(`  ✅ 8. SUPPORT_APPLY_CLICKED 처리 — activity_events(support_apply_clicked) 저장 수=${applyEvents?.length ?? 0}`);
    if (!applyEvents || applyEvents.length === 0) throw new Error("SUPPORT_APPLY_CLICKED activity_event가 저장되지 않음");

    // 9. Lead 확인 (지원금 검사 완료 + 신청클릭 신호가 반영되어 재계산되었는지)
    const { data: lead } = await admin.from("leads").select("score, grade").eq("user_id", userId).maybeSingle();
    console.log(`  ✅ 9. Lead 재계산 확인 — score=${lead?.score}, grade=${lead?.grade}`);
    if (!lead) throw new Error("leads row가 생성되지 않음 (recalculateLeadScore 미동작)");

    console.log("\n모든 STEP 5 Support Flow 단계가 정상적으로 통과했습니다.");
  } finally {
    console.log("\n🧹 테스트 데이터 정리 중...");
    try {
      if (userId) {
        await admin.from("support_bookmarks").delete().eq("user_id", userId);
        await admin.from("match_results").delete().eq("source_id", userId);
        if (sessionId) await admin.from("support_assessment_sessions").delete().eq("id", sessionId);
        await admin.from("activity_events").delete().eq("user_id", userId);
        await admin.from("leads").delete().eq("user_id", userId);
        await admin.from("career_profiles").delete().eq("user_id", userId);
        await admin.from("profiles").delete().eq("id", userId);
        await admin.auth.admin.deleteUser(userId);
      }
      // Mock Provider가 이번 실행에서 생성한 지원제도(external_source=mock)는 다음 실행에서도
      // 재사용 가능하므로 굳이 지우지 않는다 (deactivateStale이 자연스럽게 관리한다).
    } catch (cleanupErr) {
      console.warn("정리 중 일부 실패(무시 가능):", cleanupErr);
    }
    console.log("   완료.\n");
  }
}

main().catch((err) => {
  console.error("\n❌ E2E Support Flow 검증 실패:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
