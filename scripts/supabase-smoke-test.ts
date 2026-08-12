/**
 * STEP 3.5 [10. Supabase Smoke Test]
 *
 * 실제 Supabase 프로젝트에 대해 Career DB / 직업검사 핵심 흐름이
 * 정상적으로 저장/조회되는지 점검하는 독립 스크립트다.
 *
 * - 환경변수(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)가 없으면
 *   스킵 메시지만 출력하고 exit code 0으로 종료한다 (npm run build를 막지 않음).
 * - service_role 키로 직접 supabase-js를 사용한다 (RLS를 우회하는 서버 전용 스크립트).
 *   앱의 Repository 계층을 그대로 통과시키기보다 "DB 스키마/제약조건이 실제로
 *   기대대로 동작하는가"를 직접 검증하는 것이 목적이다.
 * - 테스트로 생성한 모든 데이터(및 임시 auth 사용자)는 마지막에 정리한다.
 *
 * 실행: npm run smoke:supabase
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type StepResult = { name: string; ok: boolean; detail?: string };
const results: StepResult[] = [];

async function step(name: string, fn: () => Promise<string | void>) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail ?? undefined });
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name, ok: false, detail: message });
    console.log(`  ❌ ${name} — ${message}`);
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    console.log(
      "⚠️  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다.\n" +
        "   Supabase Smoke Test를 스킵합니다 (Mock Mode 환경에서는 정상입니다).",
    );
    process.exit(0);
  }

  const db: SupabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const runId = Date.now().toString(36);
  const testEmail = `smoke-test-${runId}@baro-career.invalid`;
  let userId: string | null = null;
  let assessmentId: string | null = null;
  let questionId: string | null = null;
  let optionId: string | null = null;
  let occupationId: string | null = null;
  let sessionId: string | null = null;
  let resultId: string | null = null;
  let jobInterestId: string | null = null;
  let matchResultId: string | null = null;
  let activityEventId: string | null = null;
  let smokeJobId: string | null = null;
  let jobBookmarkId: string | null = null;
  let jobSyncRunId: string | null = null;
  let smokeSupportProgramId: string | null = null;
  let supportBookmarkId: string | null = null;
  let supportProgramRuleId: string | null = null;
  let supportAssessmentSessionId: string | null = null;
  let supportSyncRunId: string | null = null;
  let supportMatchResultId: string | null = null;

  // anonymous 흐름 -> anonymous_id → user_id 병합 검증용
  const anonymousId = `anon-smoke-${runId}`;
  let anonSessionId: string | null = null;
  let anonResultId: string | null = null;
  let anonActivityEventId: string | null = null;

  console.log(`\n▶ Supabase Smoke Test 시작 (${url})\n`);

  try {
    // ── 0) 테스트용 회원 생성 (profiles) ────────────────────────────────
    await step("0. 임시 회원 생성 (auth.users + profiles)", async () => {
      const { data, error } = await db.auth.admin.createUser({
        email: testEmail,
        email_confirm: true,
        password: `Smoke!${runId}Aa1`,
      });
      if (error || !data.user) throw new Error(error?.message ?? "createUser 실패");
      userId = data.user.id;

      // STEP 6부터 auth.users insert 시 handle_new_auth_user 트리거(0033)가 profiles/career_profiles/
      // user_roles/user_acquisition을 이미 원자적으로 생성하므로, insert 대신 update로 표시용 이름만 갱신한다.
      const { error: profileError } = await db
        .from("profiles")
        .update({ name: "스모크테스트" })
        .eq("id", userId);
      if (profileError) throw new Error(profileError.message);
      return `user_id=${userId}`;
    });

    // ── 1) CareerProfile CRUD ───────────────────────────────────────────
    await step("1. CareerProfile CRUD (career_profiles)", async () => {
      if (!userId) throw new Error("선행 단계 실패로 스킵");
      // profiles와 마찬가지로 0033 트리거가 career_profiles를 이미 생성했으므로 update로 시작한다.
      const { error: insertError } = await db
        .from("career_profiles")
        .update({
          employment_status: "seeking",
          career_years: 12,
          preferred_region: "seoul",
          profile_completeness: 40,
        })
        .eq("user_id", userId);
      if (insertError) throw new Error(`insert: ${insertError.message}`);

      const { error: updateError } = await db
        .from("career_profiles")
        .update({ profile_completeness: 70, has_driver_license: true })
        .eq("user_id", userId);
      if (updateError) throw new Error(`update: ${updateError.message}`);

      const { data, error: readError } = await db
        .from("career_profiles")
        .select("profile_completeness, has_driver_license")
        .eq("user_id", userId)
        .single();
      if (readError) throw new Error(`select: ${readError.message}`);
      if (data.profile_completeness !== 70) throw new Error("update가 반영되지 않음");
      return "insert/update/select 정상";
    });

    // ── 2) Assessment Session 생성 ──────────────────────────────────────
    await step("2. Assessment Session 생성 (assessment_sessions)", async () => {
      // 여러 개의 활성 assessment가 존재할 수 있으므로(예: 구버전 legacy assessment는 질문이 없음),
      // "질문이 실제로 연결된" assessment를 우선 선택해 뒤이은 answer 저장 테스트가 항상 동작하게 한다.
      const { data: questionRow, error: questionRowError } = await db
        .from("assessment_questions")
        .select("id, assessment_id")
        .limit(1)
        .maybeSingle();
      if (questionRowError) throw new Error(`assessment_questions 조회: ${questionRowError.message}`);

      let assessment: { id: string } | null = null;
      if (questionRow) {
        assessmentId = questionRow.assessment_id as string;
        questionId = questionRow.id as string;
        assessment = { id: assessmentId };
      } else {
        const { data: fallbackAssessment, error: assessmentError } = await db
          .from("assessments")
          .select("id")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if (assessmentError) throw new Error(`assessments 조회: ${assessmentError.message}`);
        assessment = fallbackAssessment;
        questionId = null;
      }
      if (!assessment) throw new Error("활성 assessment가 없음 (seed 미적용 가능성)");
      assessmentId = assessment.id;

      if (questionId) {
        const { data: option } = await db
          .from("assessment_options")
          .select("id")
          .eq("question_id", questionId)
          .limit(1)
          .maybeSingle();
        optionId = (option?.id as string) ?? null;
      }

      const { data: session, error: sessionError } = await db
        .from("assessment_sessions")
        .insert({ assessment_id: assessmentId, user_id: userId, status: "in_progress" })
        .select("id")
        .single();
      if (sessionError) throw new Error(`insert: ${sessionError.message}`);
      sessionId = session.id as string;
      return `session_id=${sessionId}`;
    });

    // ── 3) Answer 저장/upsert ───────────────────────────────────────────
    await step("3. Answer 저장/upsert (assessment_answers)", async () => {
      if (!sessionId || !questionId) throw new Error("질문 데이터 없음 (seed 미적용) — 스킵");
      const insertPayload = {
        session_id: sessionId,
        question_id: questionId,
        option_id: optionId,
        option_ids: optionId ? [optionId] : [],
      };
      const { error: firstError } = await db
        .from("assessment_answers")
        .upsert(insertPayload, { onConflict: "session_id,question_id" });
      if (firstError) throw new Error(`upsert #1: ${firstError.message}`);

      // 같은 (session, question) 재제출 시 unique 제약으로 덮어써지는지(중복 row 생성 안 됨) 검증
      const { error: secondError } = await db
        .from("assessment_answers")
        .upsert({ ...insertPayload, answer_value: { retried: true } }, { onConflict: "session_id,question_id" });
      if (secondError) throw new Error(`upsert #2: ${secondError.message}`);

      const { count, error: countError } = await db
        .from("assessment_answers")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionId)
        .eq("question_id", questionId);
      if (countError) throw new Error(`count: ${countError.message}`);
      if (count !== 1) throw new Error(`중복 방지 실패 — count=${count}`);
      return "unique(session_id, question_id) upsert 정상";
    });

    // ── 4) Result 저장 ──────────────────────────────────────────────────
    await step("4. Result 저장 (assessment_results)", async () => {
      if (!assessmentId) throw new Error("선행 단계 실패로 스킵");
      const { data, error } = await db
        .from("assessment_results")
        .insert({
          session_id: sessionId,
          assessment_id: assessmentId,
          user_id: userId,
          engine_version: "CAREER_ASSESSMENT_V1",
          scores: { readiness: 72 },
          dimension_scores: { stability: 4.1, activity: 3.4 },
          extracted_profile: { desiredEmploymentType: "full_time" },
          generated_tags: ["운전가능"],
          recommended_occupations: [{ occupationId: "smoke-occ", score: 88 }],
          raw_result: { engineVersion: "CAREER_ASSESSMENT_V1", note: "smoke-test" },
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      resultId = data.id as string;
      return `result_id=${resultId} (engine_version/scores/dimension_scores/recommended_occupations 포함)`;
    });

    // ── 5) Job(Occupation) Interest 저장 ────────────────────────────────
    await step("5. Occupation Interest 저장 (user_job_interests)", async () => {
      const { data: occupation } = await db.from("occupations").select("id").limit(1).maybeSingle();
      if (!occupation) throw new Error("occupations 데이터 없음 (seed 미적용) — 스킵");
      occupationId = occupation.id as string;

      const { data, error } = await db
        .from("user_job_interests")
        .insert({ user_id: userId, occupation_id: occupationId, interest_score: 80, source: "assessment" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      jobInterestId = data.id as string;

      // 같은 (user, occupation) 재추천 시 unique 제약이 걸리는지 확인 (Repository는 upsert로 회피)
      const { error: dupError } = await db
        .from("user_job_interests")
        .insert({ user_id: userId, occupation_id: occupationId, interest_score: 90 });
      if (!dupError) throw new Error("user+occupation unique 제약이 동작하지 않음");
      return `job_interest_id=${jobInterestId}, 중복 삽입은 정상적으로 거부됨`;
    });

    // ── 6) Match Result 저장 ────────────────────────────────────────────
    await step("6. Match Result 저장 (match_results)", async () => {
      if (!occupationId) throw new Error("선행 단계 실패로 스킵");
      const { data, error } = await db
        .from("match_results")
        .insert({
          user_id: userId,
          source_type: "user",
          source_id: userId,
          target_type: "occupation",
          target_id: occupationId,
          score: 88,
          grade: "A",
          reason: ["smoke-test"],
          engine_version: "rule-v1",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      matchResultId = data.id as string;
      return `match_result_id=${matchResultId}`;
    });

    // ── 7) Activity Event 저장 ──────────────────────────────────────────
    await step("7. Activity Event 저장 (activity_events)", async () => {
      const { data, error } = await db
        .from("activity_events")
        .insert({
          user_id: userId,
          event_type: "ASSESSMENT_COMPLETED",
          entity_type: "assessment_result",
          entity_id: resultId,
          metadata: { smokeTest: true },
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      activityEventId = data.id as string;
      return `activity_event_id=${activityEventId}`;
    });

    // ── 8) Lead 재계산(upsert) ──────────────────────────────────────────
    await step("8. Lead 재계산 및 upsert (leads)", async () => {
      const { data: existing } = await db.from("leads").select("id").eq("user_id", userId).maybeSingle();
      if (existing) {
        const { error } = await db
          .from("leads")
          .update({ score: 82, grade: "A", last_activity_at: new Date().toISOString() })
          .eq("user_id", userId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db.from("leads").insert({
          user_id: userId,
          score: 82,
          grade: "A",
          status: "new",
          primary_interest: occupationId ?? undefined,
          last_activity_at: new Date().toISOString(),
        });
        if (error) throw new Error(error.message);
      }
      return "leads upsert 정상 (신규 생성 경로 포함)";
    });

    // ── 9) 비회원(anonymous_id) 검사 흐름 ────────────────────────────────
    await step("9. 비회원 검사 흐름 (anonymous_id 기반 session/result/interest/match/activity)", async () => {
      if (!assessmentId) throw new Error("선행 단계 실패로 스킵");
      const { data: session, error: sessionError } = await db
        .from("assessment_sessions")
        .insert({ assessment_id: assessmentId, anonymous_id: anonymousId, status: "completed" })
        .select("id")
        .single();
      if (sessionError) throw new Error(`session: ${sessionError.message}`);
      anonSessionId = session.id as string;

      const { data: result, error: resultError } = await db
        .from("assessment_results")
        .insert({
          session_id: anonSessionId,
          assessment_id: assessmentId,
          anonymous_id: anonymousId,
          engine_version: "CAREER_ASSESSMENT_V1",
          scores: { readiness: 60 },
        })
        .select("id")
        .single();
      if (resultError) throw new Error(`result: ${resultError.message}`);
      anonResultId = result.id as string;

      if (occupationId) {
        const { error: interestError } = await db
          .from("user_job_interests")
          .insert({ anonymous_id: anonymousId, occupation_id: occupationId, interest_score: 50 });
        if (interestError) throw new Error(`job_interest: ${interestError.message}`);

        const { error: matchError } = await db.from("match_results").insert({
          source_type: "user",
          source_id: anonymousId,
          anonymous_id: anonymousId,
          target_type: "occupation",
          target_id: occupationId,
          score: 70,
          grade: "B",
        });
        if (matchError) throw new Error(`match_result: ${matchError.message}`);
      }

      const { data: activity, error: activityError } = await db
        .from("activity_events")
        .insert({ anonymous_id: anonymousId, event_type: "ASSESSMENT_COMPLETED", metadata: { smokeTest: true } })
        .select("id")
        .single();
      if (activityError) throw new Error(`activity: ${activityError.message}`);
      anonActivityEventId = activity.id as string;

      return `anonymous_id=${anonymousId} 로 세션/결과/관심/매칭/활동 전부 비회원 상태로 저장됨`;
    });

    // ── 10) anonymous → user 병합 RPC 검증 ──────────────────────────────
    await step("10. anonymous → user 병합 RPC (link_anonymous_career_data)", async () => {
      if (!userId) throw new Error("선행 단계 실패로 스킵");
      const { data, error } = await db.rpc("link_anonymous_career_data", {
        p_anonymous_id: anonymousId,
        p_user_id: userId,
      });
      if (error) throw new Error(error.message);

      const { data: mergedSession } = await db
        .from("assessment_sessions")
        .select("user_id, anonymous_id")
        .eq("id", anonSessionId)
        .single();
      if (mergedSession?.user_id !== userId) throw new Error("assessment_sessions 병합 실패");

      const { data: mergedResult } = await db
        .from("assessment_results")
        .select("user_id")
        .eq("id", anonResultId)
        .single();
      if (mergedResult?.user_id !== userId) throw new Error("assessment_results 병합 실패");

      const { data: mergedActivity } = await db
        .from("activity_events")
        .select("user_id, anonymous_id")
        .eq("id", anonActivityEventId)
        .single();
      if (mergedActivity?.user_id !== userId) throw new Error("activity_events 병합 실패");

      const { data: link } = await db
        .from("anonymous_identity_links")
        .select("id")
        .eq("anonymous_id", anonymousId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!link) throw new Error("anonymous_identity_links 기록 누락");

      return `RPC 결과=${JSON.stringify(data)}, 병합 후 조회 검증 통과`;
    });

    // ── 11) STEP 4: 채용공고 외부 Provider 중복 방지 (jobs.external_source/external_id) ──
    await step("11. 채용공고 external upsert 중복 방지 (jobs)", async () => {
      const externalId = `smoke-${runId}`;
      const { data: inserted, error: insertError } = await db
        .from("jobs")
        .insert({
          title: "스모크테스트 공고",
          company_name: "스모크테스트",
          job_category: "care_worker",
          region: "seoul",
          external_source: "smoke-provider",
          external_id: externalId,
          is_active: true,
          status: "published",
          fetched_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insertError) throw new Error(`insert: ${insertError.message}`);
      smokeJobId = inserted.id as string;

      // 동일 (external_source, external_id) 재삽입은 unique index로 거부되어야 한다 (0020 migration).
      const { error: dupError } = await db.from("jobs").insert({
        title: "중복 공고",
        company_name: "스모크테스트",
        job_category: "care_worker",
        region: "seoul",
        external_source: "smoke-provider",
        external_id: externalId,
      });
      if (!dupError) throw new Error("(external_source, external_id) unique 제약이 동작하지 않음");

      return `job_id=${smokeJobId}, 중복 external_id 삽입은 정상적으로 거부됨`;
    });

    // ── 12) STEP 4: 채용공고 찜 (job_bookmarks unique) ──────────────────
    await step("12. 채용공고 찜 저장 및 중복 방지 (job_bookmarks)", async () => {
      if (!userId || !smokeJobId) throw new Error("선행 단계 실패로 스킵");
      const { data, error } = await db
        .from("job_bookmarks")
        .insert({ user_id: userId, job_id: smokeJobId })
        .select("id")
        .single();
      if (error) throw new Error(`insert: ${error.message}`);
      jobBookmarkId = data.id as string;

      const { error: dupError } = await db.from("job_bookmarks").insert({ user_id: userId, job_id: smokeJobId });
      if (!dupError) throw new Error("(user_id, job_id) unique 제약이 동작하지 않음");

      return `job_bookmark_id=${jobBookmarkId}, 중복 찜은 정상적으로 거부됨`;
    });

    // ── 13) STEP 4: Job Sync Run 기록 (job_sync_runs) ────────────────────
    await step("13. Job Sync Run 기록 (job_sync_runs)", async () => {
      const { data, error } = await db
        .from("job_sync_runs")
        .insert({
          provider: "mock",
          status: "success",
          fetched_count: 3,
          new_count: 1,
          updated_count: 2,
          triggered_by: "smoke-test",
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      jobSyncRunId = data.id as string;
      return `job_sync_run_id=${jobSyncRunId}`;
    });

    // ── 14) STEP 5: 지원제도 external upsert 중복 방지 (support_programs) ──
    await step("14. 지원제도 external upsert 중복 방지 (support_programs)", async () => {
      const externalId = `smoke-support-${runId}`;
      const { data: inserted, error: insertError } = await db
        .from("support_programs")
        .insert({
          title: "스모크테스트 지원제도",
          organization: "스모크테스트기관",
          organization_name: "스모크테스트기관",
          category: "employment",
          support_type: "subsidy",
          external_source: "smoke-provider",
          external_id: externalId,
          is_active: true,
          status: "published",
          fetched_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insertError) throw new Error(`insert: ${insertError.message}`);
      smokeSupportProgramId = inserted.id as string;

      // 동일 (external_source, external_id) 재삽입은 unique index로 거부되어야 한다 (0027 migration).
      const { error: dupError } = await db.from("support_programs").insert({
        title: "중복 지원제도",
        organization: "스모크테스트기관",
        external_source: "smoke-provider",
        external_id: externalId,
      });
      if (!dupError) throw new Error("(external_source, external_id) unique 제약이 동작하지 않음");

      return `support_program_id=${smokeSupportProgramId}, 중복 external_id 삽입은 정상적으로 거부됨`;
    });

    // ── 15) STEP 5: 지원제도 찜 (support_bookmarks unique) ───────────────
    await step("15. 지원제도 찜 저장 및 중복 방지 (support_bookmarks)", async () => {
      if (!userId || !smokeSupportProgramId) throw new Error("선행 단계 실패로 스킵");
      const { data, error } = await db
        .from("support_bookmarks")
        .insert({ user_id: userId, support_program_id: smokeSupportProgramId })
        .select("id")
        .single();
      if (error) throw new Error(`insert: ${error.message}`);
      supportBookmarkId = data.id as string;

      const { error: dupError } = await db
        .from("support_bookmarks")
        .insert({ user_id: userId, support_program_id: smokeSupportProgramId });
      if (!dupError) throw new Error("(user_id, support_program_id) unique 제약이 동작하지 않음");

      return `support_bookmark_id=${supportBookmarkId}, 중복 찜은 정상적으로 거부됨`;
    });

    // ── 16) STEP 5: Eligibility Rule Engine (support_program_rules) ──────
    await step("16. Eligibility Rule 저장 (support_program_rules)", async () => {
      if (!smokeSupportProgramId) throw new Error("선행 단계 실패로 스킵");
      const { data, error } = await db
        .from("support_program_rules")
        .insert({
          support_program_id: smokeSupportProgramId,
          field: "age",
          operator: "between",
          value: [40, 64],
          weight: 15,
          is_required: true,
          rule_type: "structured",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      supportProgramRuleId = data.id as string;
      return `support_program_rule_id=${supportProgramRuleId}`;
    });

    // ── 17) STEP 5: 지원금 진단 세션 (support_assessment_sessions) ────────
    await step("17. 지원금 진단 세션 저장 (support_assessment_sessions)", async () => {
      if (!userId) throw new Error("선행 단계 실패로 스킵");
      const { data, error } = await db
        .from("support_assessment_sessions")
        .insert({
          user_id: userId,
          status: "completed",
          answers: { ageGroup: "50s", region: "seoul", employmentStatus: "career_break", trainingWillingness: 4 },
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      supportAssessmentSessionId = data.id as string;
      return `support_assessment_session_id=${supportAssessmentSessionId}`;
    });

    // ── 18) STEP 5: Support Sync Run 기록 (support_sync_runs) ────────────
    await step("18. Support Sync Run 기록 (support_sync_runs)", async () => {
      const { data, error } = await db
        .from("support_sync_runs")
        .insert({
          provider: "mock",
          status: "success",
          fetched_count: 5,
          new_count: 2,
          updated_count: 3,
          triggered_by: "smoke-test",
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      supportSyncRunId = data.id as string;
      return `support_sync_run_id=${supportSyncRunId}`;
    });

    // ── 19) STEP 5: Support Match Result + detail jsonb (match_results) ──
    await step("19. Support Match Result 저장 (match_results.detail)", async () => {
      if (!userId || !smokeSupportProgramId) throw new Error("선행 단계 실패로 스킵");
      const { data, error } = await db
        .from("match_results")
        .insert({
          user_id: userId,
          source_type: "user",
          source_id: userId,
          target_type: "support_program",
          target_id: smokeSupportProgramId,
          score: 75,
          grade: "HIGH",
          reason: ["smoke-test"],
          detail: {
            matchedConditions: ["연령 일치"],
            missingConditions: [],
            checkRequiredConditions: ["소득 조건 확인 필요"],
          },
          engine_version: "SUPPORT_ELIGIBILITY_V1",
        })
        .select("id, detail")
        .single();
      if (error) throw new Error(error.message);
      supportMatchResultId = data.id as string;
      if (!data.detail?.matchedConditions) throw new Error("detail jsonb 컬럼이 저장되지 않음");
      return `match_result_id=${supportMatchResultId} (detail jsonb 포함)`;
    });
  } finally {
    // ── Cleanup: 생성한 모든 데이터 + 임시 회원 삭제 ─────────────────────
    console.log("\n🧹 테스트 데이터 정리 중...");
    const cleanupTargets: Array<[string, Record<string, unknown>]> = [
      ["match_results", supportMatchResultId ? { id: supportMatchResultId } : {}],
      ["support_sync_runs", supportSyncRunId ? { id: supportSyncRunId } : {}],
      ["support_assessment_sessions", supportAssessmentSessionId ? { id: supportAssessmentSessionId } : {}],
      ["support_program_rules", supportProgramRuleId ? { id: supportProgramRuleId } : {}],
      ["support_bookmarks", supportBookmarkId ? { id: supportBookmarkId } : {}],
      ["support_programs", smokeSupportProgramId ? { id: smokeSupportProgramId } : {}],
      ["job_sync_runs", jobSyncRunId ? { id: jobSyncRunId } : {}],
      ["job_bookmarks", jobBookmarkId ? { id: jobBookmarkId } : {}],
      ["jobs", smokeJobId ? { id: smokeJobId } : {}],
      ["match_results", matchResultId ? { id: matchResultId } : {}],
      ["match_results", { anonymous_id: anonymousId }],
      ["user_job_interests", jobInterestId ? { id: jobInterestId } : {}],
      ["user_job_interests", { anonymous_id: anonymousId }],
      ["activity_events", activityEventId ? { id: activityEventId } : {}],
      // RPC 병합 후에는 anonymous_id가 비워지고 user_id로 대체되므로, anonymous_id 매칭만으로는
      // 병합된 행을 못 찾는다. anonActivityEventId로 직접 지정해 확실히 정리한다.
      ["activity_events", anonActivityEventId ? { id: anonActivityEventId } : {}],
      ["activity_events", { anonymous_id: anonymousId }],
      ["assessment_results", resultId ? { id: resultId } : {}],
      ["assessment_results", anonResultId ? { id: anonResultId } : {}],
      ["assessment_answers", sessionId ? { session_id: sessionId } : {}],
      ["assessment_sessions", sessionId ? { id: sessionId } : {}],
      ["assessment_sessions", anonSessionId ? { id: anonSessionId } : {}],
      ["anonymous_identity_links", { anonymous_id: anonymousId }],
      ["leads", userId ? { user_id: userId } : {}],
      ["career_profiles", userId ? { user_id: userId } : {}],
      ["profiles", userId ? { id: userId } : {}],
    ];
    for (const [table, match] of cleanupTargets) {
      if (Object.keys(match).length === 0) continue;
      try {
        await db.from(table).delete().match(match);
      } catch {
        // best-effort cleanup — 개별 실패는 무시하고 계속 진행
      }
    }
    if (userId) {
      try {
        await db.auth.admin.deleteUser(userId);
      } catch {
        // best-effort
      }
    }
    console.log("   완료.\n");
  }

  const failed = results.filter((r) => !r.ok);
  console.log("─".repeat(60));
  console.log(`Smoke Test 결과: ${results.length - failed.length}/${results.length} 통과`);
  if (failed.length > 0) {
    console.log("\n실패한 항목:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  } else {
    console.log("모든 항목이 통과했습니다.");
  }
}

main().catch((err) => {
  console.error("Smoke Test 실행 중 예상치 못한 오류:", err);
  process.exitCode = 1;
});
