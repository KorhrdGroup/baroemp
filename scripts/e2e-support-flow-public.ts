/**
 * STEP 5.5 [14] 실 API 전용 E2E 테스트.
 *
 * e2e-support-flow.ts(Mock 기준)와 분리해, 실제 "행정안전부_대한민국 공공서비스(혜택) 정보" API로
 * 동기화한 데이터만을 대상으로 지원금 찾기 전체 Flow를 검증한다. PUBLIC_SERVICE_API_KEY가 없거나
 * SUPPORT_PROVIDER가 public_service로 활성화되지 않은 환경에서는 (실패가 아니라) 건너뛴다 —
 * 실 API 장애/키 미설정이 Mock 기준 회귀 테스트(e2e:support)에 영향을 주지 않도록 분리하는 것이 목적이다.
 *
 * 실행: npx tsx --env-file-if-exists=.env.local scripts/e2e-support-flow-public.ts
 */
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { resolveActiveSupportProviderName } from "@/features/support/providers";
import { syncSupportProgramsFromProvider } from "@/services/support-sync.service";
import { searchSupportPrograms } from "@/services/support-search.service";
import {
  startSupportAssessment,
  saveSupportAssessmentAnswers,
  completeSupportAssessment,
} from "@/services/support-assessment.service";
import { promoteSupportInterestTags } from "@/services/support-interest.service";
import { recalculateLeadScore } from "@/services/lead-score.service";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { getSupportBookmarkRepository, getSupportProgramRepository } from "@/lib/repositories";

// STEP 6 참고: e2e-support-flow.ts와 동일한 이유로 Server Action 대신 하위 서비스를 직접 호출한다
// (이 스크립트는 next/headers 쿠키 세션이 없는 순수 Node 실행 컨텍스트).

async function main() {
  if (process.env.DATA_SOURCE_MODE !== "supabase") {
    console.error("DATA_SOURCE_MODE=supabase 가 아닙니다. .env.local을 확인하세요.");
    process.exit(1);
  }

  const providerName = resolveActiveSupportProviderName();
  if (providerName !== "public_service") {
    console.log(
      `⏭️  SKIP: 현재 활성 Support Provider가 "${providerName}"입니다 (public_service 아님). ` +
        "PUBLIC_SERVICE_API_KEY 미설정 시 정상적으로 건너뜁니다 — 실패로 처리하지 않습니다.",
    );
    process.exit(0);
  }

  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Supabase Admin Client 생성 실패 (서비스 키 확인 필요)");
  const email = `e2e-support-public-${Date.now()}@baro.local`;
  let userId: string | undefined;
  let sessionId: string | undefined;

  try {
    console.log("▶ 실 API(public_service) 기준 지원금 찾기 Flow 검증 시작\n");

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: "password123!",
      email_confirm: true,
    });
    if (createErr || !created.user) throw new Error(`임시 회원 생성 실패: ${createErr?.message}`);
    userId = created.user.id;
    // STEP 6부터 auth.users insert 시 handle_new_auth_user 트리거(0033)가 profiles를 이미 생성한다.
    const { error: profileErr } = await admin
      .from("profiles")
      .update({ name: "E2E Support(Public API) 테스트" })
      .eq("id", userId);
    if (profileErr) throw new Error(`profile 갱신 실패: ${profileErr.message}`);
    console.log(`  ✅ 0. 임시 회원 생성 — user_id=${userId} (profiles는 0033 트리거가 자동 생성)`);

    // 1. 실 API Sync (소량: 관련도 판정 + Detail/Conditions 보강까지 실제 호출)
    const summary = await syncSupportProgramsFromProvider({ triggeredBy: "e2e-test-public", maxPages: 2, pageSize: 100 });
    console.log(
      `  ✅ 1. syncSupportProgramsFromProvider() — provider=${summary.provider}, isMock=${summary.isMock}, ` +
        `fetched=${summary.fetchedCount}, new=${summary.newCount}, updated=${summary.updatedCount}, ` +
        `relevant=${summary.relevantCount}, enriched=${summary.enrichedCount}, errors=${summary.errorCount}`,
    );
    if (summary.isMock) throw new Error("public_service Provider를 기대했으나 Mock으로 동작함");
    if (summary.fetchedCount === 0) throw new Error("실 API가 지원제도를 하나도 반환하지 않음");
    if ((summary.relevantCount ?? 0) === 0) {
      throw new Error("실 API 데이터 중 '바로취업 관련도' 임계값을 넘는 지원제도가 하나도 없음 (career-relevance 로직 점검 필요)");
    }

    // 2. 검색 결과가 실제 public_service 데이터인지 확인 (임의 생성 데이터가 아님)
    const searchResult = await searchSupportPrograms({
      activeOnly: true,
      provider: "public_service",
      page: 1,
      pageSize: 20,
      sort: "recommended",
    });
    console.log(`  ✅ 2. searchSupportPrograms(provider=public_service) — total=${searchResult.total}`);
    if (searchResult.items.length === 0) throw new Error("public_service로 필터링한 검색 결과가 비어있음");
    const sample = searchResult.items[0];
    if (sample.externalSource !== "public_service") throw new Error("externalSource가 public_service가 아님");
    if (!sample.sourceUrl || !/^https?:\/\//.test(sample.sourceUrl)) {
      throw new Error(`sourceUrl이 실제 URL 형식이 아님(임의 생성 의심): ${sample.sourceUrl}`);
    }
    console.log(`     - 샘플: "${sample.title}" (${sample.organizationName}) / sourceUrl=${sample.sourceUrl}`);

    // 3. 지원금 진단 제출 -> 실 데이터 기준 매칭
    const session = await startSupportAssessment({ userId });
    await saveSupportAssessmentAnswers(session.id, {
      ageGroup: "30s",
      region: "seoul",
      employmentStatus: "unemployed",
      desiredStartTiming: "immediately",
      trainingWillingness: 4,
      heldQualifications: [],
      desiredJobCategories: [],
      careerBreak: false,
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
      `  ✅ 3. 지원금 진단 제출 처리 — sessionId=${sessionId}, total=${submitResult.totalCount}, ` +
        `high=${submitResult.highCount}, checkRequired=${submitResult.checkRequiredCount}`,
    );
    if (submitResult.totalCount === 0) throw new Error("실 데이터 기준 매칭된 지원제도가 하나도 없음");

    const { data: matchRows } = await admin
      .from("match_results")
      .select("id, target_id, target_type, grade")
      .eq("source_id", userId)
      .eq("target_type", "support_program");
    if (!matchRows || matchRows.length === 0) throw new Error("match_results가 저장되지 않음");
    const matchedProgramId = matchRows[0].target_id as string;

    const { data: matchedProgramRow } = await admin
      .from("support_programs")
      .select("external_source, title, career_relevance_score")
      .eq("id", matchedProgramId)
      .maybeSingle();
    console.log(
      `  ✅ 3-1. match_results 저장 확인 — rows=${matchRows.length}, 매칭 프로그램="${matchedProgramRow?.title}" ` +
        `(external_source=${matchedProgramRow?.external_source}, career_relevance_score=${matchedProgramRow?.career_relevance_score})`,
    );

    // 4. 상세 조회 -> 찜 -> 신청 클릭 -> Lead 재계산 (실 데이터 기준)
    const matchedProgram = await getSupportProgramRepository().findById(matchedProgramId);
    if (!matchedProgram) throw new Error("매칭된 지원제도를 다시 조회할 수 없음");

    await logActivityEvent({
      userId,
      eventType: "support_viewed",
      entityType: "support_program",
      entityId: matchedProgram.id,
      metadata: { supportProgramId: matchedProgram.id, matchScore: 80, eligibilityGrade: "HIGH" },
    });
    await promoteSupportInterestTags(userId, matchedProgram);
    await recalculateLeadScore(userId);

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
    console.log(`  ✅ 4. 상세조회 + 찜 — DB 저장 수=${bookmarks.length}`);
    if (!bookmarks.some((b) => b.supportProgramId === matchedProgramId)) throw new Error("support_bookmarks에 저장되지 않음");

    await logActivityEvent({
      userId,
      eventType: "support_apply_clicked",
      entityType: "support_program",
      entityId: matchedProgram.id,
      metadata: { supportProgramId: matchedProgram.id },
    });
    await recalculateLeadScore(userId);
    const { data: lead } = await admin.from("leads").select("score, grade").eq("user_id", userId).maybeSingle();
    console.log(`  ✅ 5. 신청 클릭 + Lead 재계산 확인 — score=${lead?.score}, grade=${lead?.grade}`);
    if (!lead) throw new Error("leads row가 생성되지 않음 (recalculateLeadScore 미동작)");

    console.log("\n모든 실 API 기준 Support Flow 단계가 정상적으로 통과했습니다.");
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
      // 실 API로 동기화된 support_programs(external_source=public_service)는 다음 실행에서도
      // 재사용 가능하므로 지우지 않는다 (반복 호출로 API 쿼터를 낭비하지 않기 위함).
    } catch (cleanupErr) {
      console.warn("정리 중 일부 실패(무시 가능):", cleanupErr);
    }
    console.log("   완료.\n");
  }
}

main().catch((err) => {
  console.error("\n❌ 실 API 기준 E2E Support Flow 검증 실패:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
