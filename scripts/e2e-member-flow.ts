/**
 * STEP 6 [38] Member-first E2E.
 *
 * "회원가입 필수" 아키텍처 기준으로, 한 명의 실제 회원이
 *   비회원 상태 → 보호 Route 정책 확인 → 회원가입(Supabase Auth, 트리거로 Career Identity 생성)
 *   → 로그인 세션 확인 → 직업진단 완료 → 채용공고 조회/찜 → 지원금진단 → Match/Activity/Lead
 *   → /mypage 데이터 확인(getUserCrmDetail) → 로그아웃 → 접근 차단 → 재로그인 → 데이터 유지 확인
 * 을 실제 Supabase(Auth + DB)로 1회 실행하며 전 구간을 검증한다.
 *
 * 인증 경계(로그인/로그아웃/세션/RLS)는 실제 Supabase Auth 세션(anon client + JWT)으로 검증하고,
 * 서비스 로직(직업진단/채용/지원금/Lead)은 각 서비스 함수를 실제 userId로 직접 호출해 검증한다
 * (Server Action의 쿠키 세션 의존성은 npm run smoke:auth가 별도로 검증했으므로 여기서는 중복하지 않는다).
 *
 * 실행: npx tsx --env-file-if-exists=.env.local scripts/e2e-member-flow.ts
 */
process.env.SUPPORT_PROVIDER = "mock";
delete process.env.PUBLIC_SERVICE_API_KEY;

import { createClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isProtectedPath, sanitizeNextPath, buildLoginRedirectUrl } from "@/lib/auth/redirect";
import {
  startAssessmentSession,
  submitAssessmentAnswer,
  completeAssessmentSession,
} from "@/features/assessment-engine/assessment-service";
import { loadAssessment } from "@/features/assessment-engine/question-loader";
import { syncJobsFromProvider } from "@/services/job-sync.service";
import { searchJobs } from "@/services/job-search.service";
import { recordJobInterestSignal } from "@/services/job-interest.service";
import { syncSupportProgramsFromProvider } from "@/services/support-sync.service";
import { searchSupportPrograms } from "@/services/support-search.service";
import {
  startSupportAssessment,
  saveSupportAssessmentAnswers,
  completeSupportAssessment,
} from "@/services/support-assessment.service";
import { recalculateLeadScore } from "@/services/lead-score.service";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { getJobBookmarkRepository, getSupportBookmarkRepository } from "@/lib/repositories";
import { getUserCrmDetail } from "@/services/user-crm.service";

function must(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} 미설정`);
  return v;
}

let step = 0;
function log(label: string) {
  step++;
  console.log(`  ✅ ${step}. ${label}`);
}

async function main() {
  if (process.env.DATA_SOURCE_MODE !== "supabase") {
    console.error("DATA_SOURCE_MODE=supabase 가 아닙니다. .env.local을 확인하세요.");
    process.exit(1);
  }

  const url = must("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = must("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Supabase Admin Client 생성 실패 (서비스 키 확인 필요)");
  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const email = `e2e-member-${Date.now()}@baro.local`;
  const password = "MemberFlow!2026";
  let userId: string | undefined;
  let assessmentSessionId: string | undefined;
  let supportSessionId: string | undefined;
  let syncedJobId: string | undefined;
  let matchedSupportProgramId: string | undefined;

  try {
    console.log("▶ STEP 6 Member-first E2E 시작 (실제 Supabase Auth + 전체 서비스 Flow)\n");

    // 1. 비회원 상태에서 보호 Route 정책 확인 (proxy.ts가 사용하는 순수 함수 재사용)
    if (!isProtectedPath("/assessment") || !isProtectedPath("/jobs") || !isProtectedPath("/support") || !isProtectedPath("/mypage")) {
      throw new Error("보호 Route 판정이 스펙(assessment/jobs/support/mypage)과 다름");
    }
    const redirectUrl = buildLoginRedirectUrl("/support", "", "http://localhost:3000");
    if (redirectUrl.toString() !== "http://localhost:3000/login?next=%2Fsupport") {
      throw new Error(`/support 접근 시 예상한 로그인 redirect URL이 아님: ${redirectUrl}`);
    }
    if (sanitizeNextPath("https://evil.example") !== "/mypage") {
      throw new Error("외부 URL이 next로 허용됨 (open redirect 취약점)");
    }
    log("비회원 상태 — 보호 Route(/assessment,/jobs,/support,/mypage) 접근 시 /login?next=원래URL로 redirect (외부 URL은 차단)");

    // 2. 회원가입 (Supabase Auth) — 0033 트리거가 profiles/user_roles/career_profiles/user_acquisition을 원자적으로 생성
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "회원플로우 테스트" },
    });
    if (createErr || !created.user) throw new Error(`회원가입 실패: ${createErr?.message}`);
    userId = created.user.id;
    log(`신규 회원가입 — user_id=${userId}`);

    const { data: profileRow } = await admin.from("profiles").select("id, role").eq("id", userId).maybeSingle();
    if (!profileRow || profileRow.role !== "USER") throw new Error("회원가입 직후 profiles(role=USER)가 생성되지 않음");
    const { data: careerProfileRow } = await admin.from("career_profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!careerProfileRow) throw new Error("회원가입 직후 career_profiles가 생성되지 않음");
    log("Career Identity 생성 확인 — profiles(role=USER) + career_profiles 자동 생성됨 (0033 트리거)");

    // 3. 로그인 (실제 Supabase Auth 세션)
    const { data: signInData, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
    if (signInErr || !signInData.session) throw new Error(`로그인 실패: ${signInErr?.message}`);
    log(`로그인 성공 — 실제 JWT 세션 발급 (user_id=${signInData.user?.id})`);

    // 4. 직업진단 완료 (/assessment)
    const { session: aSession, assessment } = await startAssessmentSession({ userId });
    assessmentSessionId = aSession.id;
    const loaded = await loadAssessment(assessment.id);
    if (!loaded || loaded.orderedQuestions.length === 0) throw new Error("검사 정의를 불러오지 못함 (seed 미적용?)");
    for (const q of loaded.orderedQuestions) {
      const options = [...(q.options ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
      if (q.answerType === "SINGLE" && options[0]) {
        await submitAssessmentAnswer({ sessionId: aSession.id, questionId: q.id, optionId: options[0].id });
      } else if ((q.answerType === "MULTI" || q.answerType === "QUALIFICATION_MULTI") && options[0]) {
        await submitAssessmentAnswer({ sessionId: aSession.id, questionId: q.id, optionIds: [options[0].id] });
      } else if (q.answerType === "SCALE") {
        await submitAssessmentAnswer({ sessionId: aSession.id, questionId: q.id, rawValue: q.minScale ?? 3 });
      } else if (q.answerType === "NUMBER") {
        await submitAssessmentAnswer({ sessionId: aSession.id, questionId: q.id, rawValue: 3 });
      } else if (q.answerType === "REGION") {
        await submitAssessmentAnswer({ sessionId: aSession.id, questionId: q.id, rawValue: { sido: "seoul" } });
      } else if (q.answerType === "SALARY_RANGE") {
        await submitAssessmentAnswer({ sessionId: aSession.id, questionId: q.id, rawValue: { min: 2000, max: 3000 } });
      } else if (q.answerType === "TEXT") {
        await submitAssessmentAnswer({ sessionId: aSession.id, questionId: q.id, rawValue: "테스트 응답" });
      }
    }
    const assessmentResult = await completeAssessmentSession(aSession.id);
    log(`/assessment 완료 — session_id=${aSession.id}, 추천 직업 ${assessmentResult.recommendations.length}건`);

    const { count: sessionOwnerCount } = await admin
      .from("assessment_sessions")
      .select("id", { count: "exact", head: true })
      .eq("id", aSession.id)
      .eq("user_id", userId);
    if (!sessionOwnerCount) throw new Error("assessment_sessions.user_id가 로그인한 회원 id로 저장되지 않음");
    log("Assessment 데이터가 user_id 기준으로 저장됨 확인 (anonymous_id 아님)");

    // 5. 채용공고 조회/찜 (/jobs)
    const jobSyncSummary = await syncJobsFromProvider({ triggeredBy: "e2e-member-flow", maxPages: 1, pageSize: 10 });
    if (jobSyncSummary.fetchedCount === 0) throw new Error("Job Provider가 공고를 반환하지 않음");
    const jobSearch = await searchJobs({ activeOnly: true, page: 1, pageSize: 5, sort: "latest" });
    if (jobSearch.items.length === 0) throw new Error("채용공고 검색 결과가 비어있음");
    syncedJobId = jobSearch.items[0].id;
    await logActivityEvent({ userId, eventType: "job_detail_viewed", entityType: "job", entityId: syncedJobId, metadata: {} });
    await recordJobInterestSignal({ userId, job: jobSearch.items[0], signal: "JOB_VIEWED" });
    await getJobBookmarkRepository().add(userId, syncedJobId);
    await logActivityEvent({ userId, eventType: "job_bookmarked", entityType: "job", entityId: syncedJobId, metadata: {} });
    log(`/jobs 조회 + 찜 완료 — job_id=${syncedJobId}`);

    const { count: bookmarkOwnerCount } = await admin
      .from("job_bookmarks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("job_id", syncedJobId);
    if (!bookmarkOwnerCount) throw new Error("job_bookmarks.user_id가 로그인한 회원 id로 저장되지 않음");
    log("Job 데이터가 user_id 기준으로 저장됨 확인");

    // 6. 지원금 진단 (/support)
    const supportSyncSummary = await syncSupportProgramsFromProvider({
      triggeredBy: "e2e-member-flow",
      maxPages: 1,
      pageSize: 10,
    });
    if (supportSyncSummary.fetchedCount === 0) throw new Error("Support Provider가 지원제도를 반환하지 않음");
    await searchSupportPrograms({ activeOnly: true, page: 1, pageSize: 5, sort: "latest" });
    const supportSession = await startSupportAssessment({ userId });
    supportSessionId = supportSession.id;
    await saveSupportAssessmentAnswers(supportSession.id, {
      ageGroup: "50s",
      region: "seoul",
      employmentStatus: "career_break",
      desiredStartTiming: "within_3_months",
      trainingWillingness: 5,
      heldQualifications: [],
      desiredJobCategories: ["care_worker"],
      careerBreak: true,
      careerBreakMonths: 12,
    });
    const supportCompletion = await completeSupportAssessment(supportSession.id);
    matchedSupportProgramId = supportCompletion?.matches[0]?.program.id;
    if (!matchedSupportProgramId) throw new Error("지원금 진단 결과에 매칭된 지원제도가 없음");
    await getSupportBookmarkRepository().add(userId, matchedSupportProgramId);
    await logActivityEvent({
      userId,
      eventType: "support_bookmarked",
      entityType: "support_program",
      entityId: matchedSupportProgramId,
      metadata: {},
    });
    log(`/support 진단 완료 + 찜 — session_id=${supportSessionId}, 매칭 ${supportCompletion?.matches.length ?? 0}건`);

    const { count: supportOwnerCount } = await admin
      .from("support_assessment_sessions")
      .select("id", { count: "exact", head: true })
      .eq("id", supportSessionId)
      .eq("user_id", userId);
    if (!supportOwnerCount) throw new Error("support_assessment_sessions.user_id가 로그인한 회원 id로 저장되지 않음");
    log("Support 데이터가 user_id 기준으로 저장됨 확인");

    // 7. Match Results / Activity / Lead / Primary Interest
    const { count: matchCount } = await admin
      .from("match_results")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (!matchCount) throw new Error("match_results가 저장되지 않음");
    const { count: activityCount } = await admin
      .from("activity_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (!activityCount) throw new Error("activity_events가 저장되지 않음");
    log(`Match Results(${matchCount}건) / Activity(${activityCount}건) user_id 기준 저장 확인`);

    await recalculateLeadScore(userId);
    const { data: lead } = await admin
      .from("leads")
      .select("score, grade, primary_interest")
      .eq("user_id", userId)
      .maybeSingle();
    if (!lead) throw new Error("leads가 재계산되지 않음");
    log(`Lead 재계산 — score=${lead.score}, grade=${lead.grade}, primary_interest=${lead.primary_interest ?? "-"}`);

    // 8. /mypage 데이터 확인 (getUserCrmDetail — /mypage 페이지가 실제로 사용하는 서비스와 동일)
    const crmDetail = await getUserCrmDetail(userId);
    if (!crmDetail) throw new Error("getUserCrmDetail()이 null을 반환함 (mypage 데이터 조립 실패)");
    if (!crmDetail.careerProfile) throw new Error("/mypage: careerProfile이 비어있음");
    if (crmDetail.assessmentResults.length === 0) throw new Error("/mypage: assessmentResults가 비어있음");
    if (!crmDetail.jobBehavior || !crmDetail.supportBehavior) throw new Error("/mypage: job/support behavior가 비어있음");
    if (!crmDetail.lead) throw new Error("/mypage: lead가 비어있음");
    log(
      `/mypage 데이터 확인 — profile/careerProfile/assessmentResults(${crmDetail.assessmentResults.length})/` +
        `jobBehavior/supportBehavior/lead 전부 실제 데이터로 조립됨`,
    );

    // 9. 로그아웃 → 접근 차단
    const { error: signOutErr } = await anon.auth.signOut();
    if (signOutErr) throw new Error(`로그아웃 실패: ${signOutErr.message}`);
    const { data: afterLogout } = await anon.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (afterLogout) throw new Error("로그아웃 후에도 본인 profiles가 조회됨 (세션/RLS 문제)");
    log("로그아웃 성공 — 이후 세션 없이 본인 데이터 조회 불가 (RLS가 비회원으로 취급, /mypage 접근 차단과 동일 효과)");

    // 10. 재로그인 → 데이터 유지 확인
    const { data: reSignIn, error: reSignInErr } = await anon.auth.signInWithPassword({ email, password });
    if (reSignInErr || !reSignIn.session) throw new Error(`재로그인 실패: ${reSignInErr?.message}`);
    const { data: profileAfterRelogin } = await anon.from("profiles").select("id, name").eq("id", userId).maybeSingle();
    if (!profileAfterRelogin) throw new Error("재로그인 후 본인 profiles를 조회할 수 없음");
    const { data: leadAfterRelogin } = await admin.from("leads").select("score").eq("user_id", userId).maybeSingle();
    if (!leadAfterRelogin || leadAfterRelogin.score !== lead.score) {
      throw new Error("재로그인 후 Lead 데이터가 유지되지 않음");
    }
    log("재로그인 성공 — 기존 Profile/Career Identity/Lead 데이터가 그대로 유지됨 확인");
    await anon.auth.signOut();

    console.log(`\n결과: ${step}/${step} 단계 통과`);
    console.log("\nMember-first E2E(회원가입 → 서비스 이용 → 로그아웃 → 재로그인) 전 구간이 정상 동작함을 확인했습니다.");
  } finally {
    console.log("\n🧹 테스트 데이터 정리 중...");
    try {
      if (userId) {
        await admin.from("job_bookmarks").delete().eq("user_id", userId);
        await admin.from("support_bookmarks").delete().eq("user_id", userId);
        await admin.from("match_results").delete().eq("user_id", userId);
        await admin.from("user_job_interests").delete().eq("user_id", userId);
        if (supportSessionId) await admin.from("support_assessment_sessions").delete().eq("id", supportSessionId);
        if (assessmentSessionId) {
          await admin.from("assessment_results").delete().eq("session_id", assessmentSessionId);
          await admin.from("assessment_answers").delete().eq("session_id", assessmentSessionId);
          await admin.from("assessment_sessions").delete().eq("id", assessmentSessionId);
        }
        await admin.from("activity_events").delete().eq("user_id", userId);
        await admin.from("leads").delete().eq("user_id", userId);
        await admin.from("career_profiles").delete().eq("user_id", userId);
        await admin.from("user_acquisition").delete().eq("user_id", userId);
        await admin.from("user_roles").delete().eq("user_id", userId);
        await admin.from("profiles").delete().eq("id", userId);
        await admin.auth.admin.deleteUser(userId);
      }
    } catch (cleanupErr) {
      console.warn("정리 중 일부 실패(무시 가능):", cleanupErr);
    }
    console.log("   완료.\n");
  }
}

main().catch((err) => {
  console.error("\n❌ Member-first E2E 실패:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
