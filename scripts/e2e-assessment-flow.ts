/**
 * 실제 서비스 레이어(assessment-service.ts)를 통해
 * "검사 시작 → 답변 제출(전체 질문) → 검사 완료" 전체 Flow를 1회 실행하고
 * Supabase Mode에서 실제로 정상 동작하는지 검증한다.
 *
 * scripts/supabase-smoke-test.ts와 달리 이 스크립트는 raw SQL/PostgREST 호출이 아니라
 * UI → Service → Repository로 이어지는 실제 애플리케이션 코드 경로를 그대로 사용한다.
 *
 * 실행: npx tsx --env-file-if-exists=.env.local scripts/e2e-assessment-flow.ts
 */
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  startAssessmentSession,
  submitAssessmentAnswer,
  completeAssessmentSession,
} from "@/features/assessment-engine/assessment-service";
import { loadAssessment } from "@/features/assessment-engine/question-loader";
import { recalculateLeadScore } from "@/services/lead-score.service";

async function main() {
  if (process.env.DATA_SOURCE_MODE !== "supabase") {
    console.error("DATA_SOURCE_MODE=supabase 가 아닙니다. .env.local을 확인하세요.");
    process.exit(1);
  }

  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Supabase Admin Client 생성 실패 (서비스 키 확인 필요)");
  const email = `e2e-${Date.now()}@baro.local`;
  let userId: string | undefined;
  let sessionId: string | undefined;

  try {
    console.log("▶ 실제 서비스 레이어를 통한 직업검사 Flow 검증 시작 (Supabase Mode)\n");

    // 0. 임시 회원 생성
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: "password123!",
      email_confirm: true,
    });
    if (createErr || !created.user) throw new Error(`임시 회원 생성 실패: ${createErr?.message}`);
    userId = created.user.id;
    // STEP 6부터 auth.users insert 시 handle_new_auth_user 트리거(0033)가 profiles를 이미 생성한다.
    // 별도 insert 대신 표시용 이름만 갱신한다 (트리거 결과를 덮어쓰지 않고 이어서 사용).
    const { error: profileErr } = await admin.from("profiles").update({ name: "E2E 테스트" }).eq("id", userId);
    if (profileErr) throw new Error(`profile 갱신 실패: ${profileErr.message}`);
    console.log(`  ✅ 0. 임시 회원 생성 — user_id=${userId} (profiles는 0033 트리거가 자동 생성)`);

    // 1. 검사 시작 (Service Layer)
    const { session, assessment } = await startAssessmentSession({ userId });
    sessionId = session.id;
    console.log(`  ✅ 1. startAssessmentSession() — session_id=${session.id}, assessment=${assessment.title}`);

    // 2. 전체 질문에 대해 답변 제출 (Service Layer)
    const loaded = await loadAssessment(assessment.id);
    if (!loaded) throw new Error("검사 정의를 불러오지 못했습니다.");
    if (loaded.orderedQuestions.length === 0) throw new Error("질문이 없는 검사입니다 (seed 미적용?)");

    for (const question of loaded.orderedQuestions) {
      const options = [...(question.options ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
      switch (question.answerType) {
        case "SINGLE": {
          if (options[0]) {
            await submitAssessmentAnswer({ sessionId: session.id, questionId: question.id, optionId: options[0].id });
          }
          break;
        }
        case "MULTI":
        case "QUALIFICATION_MULTI": {
          if (options[0]) {
            await submitAssessmentAnswer({
              sessionId: session.id,
              questionId: question.id,
              optionIds: [options[0].id],
            });
          }
          break;
        }
        case "SCALE": {
          await submitAssessmentAnswer({
            sessionId: session.id,
            questionId: question.id,
            rawValue: question.minScale ?? 3,
          });
          break;
        }
        case "NUMBER": {
          await submitAssessmentAnswer({ sessionId: session.id, questionId: question.id, rawValue: 3 });
          break;
        }
        case "TEXT": {
          await submitAssessmentAnswer({ sessionId: session.id, questionId: question.id, rawValue: "테스트 응답" });
          break;
        }
        case "REGION": {
          await submitAssessmentAnswer({
            sessionId: session.id,
            questionId: question.id,
            rawValue: { sido: "seoul" },
          });
          break;
        }
        case "SALARY_RANGE": {
          await submitAssessmentAnswer({
            sessionId: session.id,
            questionId: question.id,
            rawValue: { min: 2000, max: 3000 },
          });
          break;
        }
      }
    }
    console.log(`  ✅ 2. submitAssessmentAnswer() x${loaded.orderedQuestions.length} — 전체 질문 답변 완료`);

    // 3. 검사 완료 (Service Layer) — Career Profile / Job Interest / Match Result / Activity / Lead 전부 트리거
    const result = await completeAssessmentSession(session.id);
    console.log(
      `  ✅ 3. completeAssessmentSession() — result_id=${result.id}, 추천 직업 ${result.recommendations.length}건, 생성 태그 ${result.generatedTags.length}개`,
    );

    // 4. Lead Score 재계산이 실제로 leads 테이블에 반영됐는지 확인
    await recalculateLeadScore(userId);
    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .select("score, grade, primary_interest")
      .eq("user_id", userId)
      .maybeSingle();
    if (leadErr) throw new Error(`leads 조회 실패: ${leadErr.message}`);
    console.log(`  ✅ 4. recalculateLeadScore() — leads row: ${JSON.stringify(lead)}`);

    // 5. DB에 실제로 저장됐는지 최종 확인 (session/answers/result/career_profile/job_interest/match_result/activity)
    const checks: Array<[string, string]> = [
      ["assessment_sessions", `id.eq.${session.id}`],
      ["assessment_answers", `session_id.eq.${session.id}`],
      ["assessment_results", `session_id.eq.${session.id}`],
      ["career_profiles", `user_id.eq.${userId}`],
      ["user_job_interests", `user_id.eq.${userId}`],
      ["match_results", `user_id.eq.${userId}`],
      ["activity_events", `session_id.eq.${session.id}`],
    ];
    console.log("\n  ▶ 최종 DB 반영 확인:");
    for (const [table, filter] of checks) {
      const [col, , val] = filter.split(".");
      const { count, error } = await admin.from(table).select("*", { count: "exact", head: true }).eq(col, val);
      if (error) throw new Error(`${table} 확인 실패: ${error.message}`);
      console.log(`     - ${table}: ${count}건`);
      if (!count) throw new Error(`${table}에 데이터가 저장되지 않았습니다.`);
    }

    console.log("\n전체 직업검사 Flow가 Supabase Mode에서 정상 동작함을 확인했습니다.");
  } finally {
    console.log("\n🧹 테스트 데이터 정리 중...");
    if (sessionId) {
      await admin.from("activity_events").delete().eq("session_id", sessionId);
      await admin.from("match_results").delete().eq("source_id", userId ?? "");
      await admin.from("assessment_results").delete().eq("session_id", sessionId);
      await admin.from("assessment_answers").delete().eq("session_id", sessionId);
      await admin.from("assessment_sessions").delete().eq("id", sessionId);
    }
    if (userId) {
      await admin.from("user_job_interests").delete().eq("user_id", userId);
      await admin.from("career_profiles").delete().eq("user_id", userId);
      await admin.from("leads").delete().eq("user_id", userId);
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
    console.log("   완료.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ E2E Flow 실패:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
