/**
 * NEXT_PUBLIC_SUPABASE_ANON_KEY (service_role이 아닌, 브라우저와 동일한 권한)로
 * RLS가 실제로 의도한 대로 동작하는지 직접 검증한다.
 *
 * - 비로그인 상태에서 공개 데이터(occupations/assessments/assessment_questions) 조회 가능해야 함
 * - 비로그인 상태에서 anonymous_id 기반 assessment_session 생성이 가능해야 함 (비회원 검사)
 * - 비로그인 상태에서 leads/profiles 등 민감 테이블은 조회/쓰기가 불가능해야 함
 *
 * 실행: npx tsx --env-file-if-exists=.env.local scripts/check-anon-rls.ts
 */
import { createClient } from "@supabase/supabase-js";

function must(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} 미설정`);
  return v;
}

async function main() {
  const url = must("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = must("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  let pass = 0;
  let fail = 0;
  async function check(label: string, fn: () => Promise<boolean>) {
    try {
      const ok = await fn();
      console.log(`${ok ? "✅" : "❌"} ${label}`);
      if (ok) pass++;
      else fail++;
    } catch (e) {
      console.log(`❌ ${label} — 예외: ${e instanceof Error ? e.message : e}`);
      fail++;
    }
  }

  await check("공개 occupations 조회 가능 (published)", async () => {
    const { data, error } = await anon.from("occupations").select("id").eq("status", "active").limit(1);
    if (error) throw error;
    return Array.isArray(data);
  });

  await check("공개 assessments 조회 가능 (is_active)", async () => {
    const { data, error } = await anon.from("assessments").select("id").eq("is_active", true).limit(1);
    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  });

  await check("공개 assessment_questions/options 조회 가능", async () => {
    const { data: q, error: qErr } = await anon.from("assessment_questions").select("id").limit(1);
    if (qErr) throw qErr;
    return Array.isArray(q) && q.length > 0;
  });

  let anonSessionId: string | null = null;
  const anonymousId = `anon-rls-check-${Date.now()}`;
  await check("비회원(anonymous_id) assessment_session 생성 가능 — 비회원 검사 시작", async () => {
    const { data: assessment } = await anon.from("assessments").select("id").eq("is_active", true).limit(1).maybeSingle();
    if (!assessment) throw new Error("활성 assessment 없음");
    const { data, error } = await anon
      .from("assessment_sessions")
      .insert({ assessment_id: assessment.id, anonymous_id: anonymousId, status: "in_progress" })
      .select("id")
      .single();
    if (error) throw error;
    anonSessionId = data.id as string;
    return Boolean(anonSessionId);
  });

  await check("본인(anonymous_id 일치) assessment_session 재조회 가능", async () => {
    if (!anonSessionId) return false;
    const { data, error } = await anon
      .from("assessment_sessions")
      .select("id")
      .eq("id", anonSessionId)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  });

  await check("비회원은 leads 테이블을 읽을 수 없어야 함 (민감정보 차단)", async () => {
    const { data, error } = await anon.from("leads").select("id").limit(1);
    if (error) return true; // RLS 위반으로 명시적 에러가 나면 OK
    return (data?.length ?? 0) === 0; // 에러 없이 통과했더라도 결과가 비어있으면 OK
  });

  await check("비회원은 profiles 테이블을 읽을 수 없어야 함 (개인정보 차단)", async () => {
    const { data, error } = await anon.from("profiles").select("id").limit(1);
    if (error) return true;
    return (data?.length ?? 0) === 0;
  });

  await check("비회원은 다른 사람 명의로 career_profiles를 쓸 수 없어야 함", async () => {
    const { error } = await anon
      .from("career_profiles")
      .insert({ user_id: "11111111-1111-1111-1111-111111111001", age_group: "40s" });
    return Boolean(error); // insert가 막혀야(에러가 나야) 정상
  });

  // 정리
  if (anonSessionId) {
    // service_role이 아니므로 anon 권한으로 지울 수 없을 수 있다 — 실패해도 무시.
    await anon.from("assessment_sessions").delete().eq("id", anonSessionId);
  }

  console.log(`\n결과: ${pass}/${pass + fail} 통과`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("오류:", err instanceof Error ? err.message : err);
  process.exit(1);
});
