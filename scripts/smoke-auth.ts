/**
 * STEP 6 [37] Auth Smoke Test.
 *
 * 실제 Supabase Auth + RLS를 "실제 authenticated USER JWT"로 검증한다
 * (service_role 클라이언트로만 확인하고 "RLS 정상"이라 결론내리지 않는다 - 스펙 33번).
 *
 * 검증 순서:
 *   테스트회원 생성(admin) → profiles/career_profiles/user_roles/user_acquisition 트리거 생성 확인(admin) →
 *   로그인(anon+password, 실제 JWT 세션 발급) → 세션 확인 → 본인 Profile 조회/수정(anon 세션) →
 *   타인 Profile 조회/수정 차단(anon 세션) → 본인 Career Profile 조회 확인 →
 *   보호 Route 정책 함수(순수 함수) 확인 → 로그아웃 후 재조회 차단 → cleanup(admin)
 *
 * 실행: npx tsx --env-file-if-exists=.env.local scripts/smoke-auth.ts
 */
import { createClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  buildLoginRedirectUrl,
  isAdminPath,
  isAuthPath,
  isProtectedPath,
  sanitizeNextPath,
} from "@/lib/auth/redirect";

function must(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} 미설정`);
  return v;
}

let pass = 0;
let fail = 0;
async function check(label: string, fn: () => Promise<boolean> | boolean) {
  try {
    const ok = await fn();
    console.log(`  ${ok ? "✅" : "❌"} ${label}`);
    if (ok) pass++;
    else fail++;
  } catch (e) {
    console.log(`  ❌ ${label} — 예외: ${e instanceof Error ? e.message : e}`);
    fail++;
  }
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

  const password = "Sm0keTest!2026";
  const emailA = `smoke-auth-a-${Date.now()}@baro.local`;
  const emailB = `smoke-auth-b-${Date.now()}@baro.local`;
  let userIdA: string | undefined;
  let userIdB: string | undefined;

  // 세션이 필요한 요청(anon+JWT)과 그렇지 않은 요청(그냥 anon)을 구분하기 위해 클라이언트 2개 사용.
  const sessionClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    console.log("▶ STEP 6 Auth Smoke Test 시작 (실제 Supabase Auth + RLS)\n");

    console.log("[0] 테스트회원 생성");
    const { data: createdA, error: createErrA } = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { name: "Smoke Auth A" },
    });
    if (createErrA || !createdA.user) throw new Error(`회원 A 생성 실패: ${createErrA?.message}`);
    userIdA = createdA.user.id;

    const { data: createdB, error: createErrB } = await admin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { name: "Smoke Auth B" },
    });
    if (createErrB || !createdB.user) throw new Error(`회원 B 생성 실패: ${createErrB?.message}`);
    userIdB = createdB.user.id;
    console.log(`  회원 A=${userIdA} / 회원 B=${userIdB}\n`);

    console.log("[1] DB Trigger(handle_new_auth_user) 기반 Profile 생성 확인 (admin client)");
    await check("profiles 행이 자동 생성됨", async () => {
      const { data } = await admin.from("profiles").select("id, role").eq("id", userIdA!).maybeSingle();
      return Boolean(data) && data?.role === "USER";
    });
    await check("career_profiles 행이 자동 생성됨", async () => {
      const { data } = await admin.from("career_profiles").select("id").eq("user_id", userIdA!).maybeSingle();
      return Boolean(data);
    });
    await check("user_roles(USER)가 자동 생성됨", async () => {
      const { data } = await admin.from("user_roles").select("role").eq("user_id", userIdA!).maybeSingle();
      return data?.role === "USER";
    });
    await check("user_acquisition 행이 자동 생성됨", async () => {
      const { data } = await admin.from("user_acquisition").select("id").eq("user_id", userIdA!).maybeSingle();
      return Boolean(data);
    });

    console.log("\n[2] 로그인 (실제 이메일+비밀번호, anon 클라이언트로 JWT 세션 발급)");
    let sessionUserId: string | undefined;
    await check("signInWithPassword 성공 + 세션 발급", async () => {
      const { data, error } = await sessionClient.auth.signInWithPassword({ email: emailA, password });
      if (error || !data.session || !data.user) return false;
      sessionUserId = data.user.id;
      return sessionUserId === userIdA;
    });
    await check("getUser()로 세션 검증 가능", async () => {
      const { data, error } = await sessionClient.auth.getUser();
      return !error && data.user?.id === userIdA;
    });

    console.log("\n[3] 본인 데이터 접근 (실제 authenticated USER JWT, RLS 적용)");
    await check("본인 profiles 조회 가능 (RLS: auth.uid() = id)", async () => {
      const { data, error } = await sessionClient.from("profiles").select("id, name").eq("id", userIdA!).maybeSingle();
      if (error) throw error;
      return Boolean(data);
    });
    await check("본인 profiles 수정 가능 (RLS: auth.uid() = id)", async () => {
      const { data, error } = await sessionClient
        .from("profiles")
        .update({ name: "Smoke Auth A (Updated)" })
        .eq("id", userIdA!)
        .select("name")
        .maybeSingle();
      if (error) throw error;
      return data?.name === "Smoke Auth A (Updated)";
    });
    await check("본인 career_profiles 조회 가능 (RLS: auth.uid() = user_id)", async () => {
      const { data, error } = await sessionClient.from("career_profiles").select("id").eq("user_id", userIdA!).maybeSingle();
      if (error) throw error;
      return Boolean(data);
    });
    await check("본인 career_profiles 수정 가능 (RLS write)", async () => {
      const { error } = await sessionClient
        .from("career_profiles")
        .update({ employment_status: "unemployed" })
        .eq("user_id", userIdA!);
      return !error;
    });
    await check("본인 명의 activity_events insert 가능 (RLS: user_id is null or auth.uid()=user_id)", async () => {
      const { error } = await sessionClient
        .from("activity_events")
        .insert({ user_id: userIdA, event_type: "login_completed", entity_type: "career_profile", metadata: {} });
      return !error;
    });
    await check("본인 activity_events 조회 가능 (RLS: auth.uid()=user_id)", async () => {
      const { data, error } = await sessionClient.from("activity_events").select("id").eq("user_id", userIdA!).limit(1);
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    });

    console.log("\n[4] 타인 데이터 접근 차단 (실제 authenticated USER JWT, RLS 적용)");
    await check("타인(B) profiles 조회 결과가 비어야 함 (RLS 차단)", async () => {
      const { data, error } = await sessionClient.from("profiles").select("id").eq("id", userIdB!).maybeSingle();
      if (error) return true; // 명시적 에러도 차단으로 인정
      return !data;
    });
    await check("타인(B) profiles 수정이 반영되지 않아야 함 (RLS 차단)", async () => {
      const { data, error } = await sessionClient
        .from("profiles")
        .update({ name: "Hacked" })
        .eq("id", userIdB!)
        .select("id");
      if (error) return true;
      return (data?.length ?? 0) === 0; // 에러 없이 통과했더라도 실제로는 아무 행도 갱신되지 않아야 함
    });
    await check("타인(B) career_profiles 조회 결과가 비어야 함 (RLS 차단)", async () => {
      const { data, error } = await sessionClient.from("career_profiles").select("id").eq("user_id", userIdB!).maybeSingle();
      if (error) return true;
      return !data;
    });
    await check("타인(B) 명의로 activity_events insert가 차단되어야 함 (RLS check)", async () => {
      const { error } = await sessionClient
        .from("activity_events")
        .insert({ user_id: userIdB, event_type: "login_completed", entity_type: "career_profile", metadata: {} });
      return Boolean(error);
    });
    await check("leads 테이블에 USER 권한으로 쓰기 시도 시 차단되어야 함 (leads_admin_write: staff/admin 전용)", async () => {
      const { error } = await sessionClient
        .from("leads")
        .insert({ user_id: userIdA, name: "test", score: 100, grade: "A", status: "new" });
      return Boolean(error);
    });

    console.log("\n[5] 보호 Route 정책 함수 검증 (proxy.ts가 사용하는 순수 함수)");
    check("isProtectedPath('/assessment')===true", () => isProtectedPath("/assessment") === true);
    check("isProtectedPath('/jobs/123')===true", () => isProtectedPath("/jobs/123") === true);
    check("isProtectedPath('/support')===true", () => isProtectedPath("/support") === true);
    check("isProtectedPath('/mypage/profile')===true", () => isProtectedPath("/mypage/profile") === true);
    check("isProtectedPath('/')===false", () => isProtectedPath("/") === false);
    check("isAdminPath('/admin/users')===true", () => isAdminPath("/admin/users") === true);
    check("isAuthPath('/login')===true", () => isAuthPath("/login") === true);
    check(
      "buildLoginRedirectUrl('/support','','http://localhost:3000') -> /login?next=%2Fsupport",
      () =>
        buildLoginRedirectUrl("/support", "", "http://localhost:3000").toString() ===
        "http://localhost:3000/login?next=%2Fsupport",
    );
    check("sanitizeNextPath('/support')==='/support' (내부 경로 허용)", () => sanitizeNextPath("/support") === "/support");
    check(
      "sanitizeNextPath('https://evil.example')==='/mypage' (외부 URL 차단)",
      () => sanitizeNextPath("https://evil.example") === "/mypage",
    );
    check("sanitizeNextPath('//evil.example')==='/mypage' (프로토콜 상대 URL 차단)", () => sanitizeNextPath("//evil.example") === "/mypage");
    check("sanitizeNextPath(null)==='/mypage' (기본값)", () => sanitizeNextPath(null) === "/mypage");

    console.log("\n[6] 로그아웃 후 접근 차단");
    await check("signOut 성공", async () => {
      const { error } = await sessionClient.auth.signOut();
      return !error;
    });
    await check("로그아웃 후 getUser()가 사용자 없음을 반환", async () => {
      const { data } = await sessionClient.auth.getUser();
      return !data.user;
    });
    await check("로그아웃 후 본인 profiles 조회도 차단됨 (세션 없음 = RLS anon 취급)", async () => {
      const { data, error } = await sessionClient.from("profiles").select("id").eq("id", userIdA!).maybeSingle();
      if (error) return true;
      return !data;
    });

    console.log(`\n결과: ${pass}/${pass + fail} 통과`);
    if (fail > 0) process.exitCode = 1;
    else console.log("\n모든 Auth Smoke Test 단계가 정상적으로 통과했습니다.");
  } finally {
    console.log("\n🧹 테스트 데이터 정리 중...");
    try {
      for (const uid of [userIdA, userIdB]) {
        if (!uid) continue;
        await admin.from("activity_events").delete().eq("user_id", uid);
        await admin.from("leads").delete().eq("user_id", uid);
        await admin.from("career_profiles").delete().eq("user_id", uid);
        await admin.from("user_acquisition").delete().eq("user_id", uid);
        await admin.from("user_roles").delete().eq("user_id", uid);
        await admin.from("profiles").delete().eq("id", uid);
        await admin.auth.admin.deleteUser(uid);
      }
    } catch (cleanupErr) {
      console.warn("정리 중 일부 실패(무시 가능):", cleanupErr);
    }
    console.log("   완료.\n");
  }
}

main().catch((err) => {
  console.error("\n❌ Auth Smoke Test 실패:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
