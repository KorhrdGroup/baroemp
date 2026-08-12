/**
 * .env.local의 STEP 5.5 관련 환경변수 "존재 여부"만 확인한다. Secret 값 자체는 절대 출력하지 않는다.
 * 실행: npx tsx --env-file-if-exists=.env.local scripts/check-env-presence.ts
 */
const KEYS = [
  "PUBLIC_SERVICE_API_KEY",
  "SUPPORT_PROVIDER",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATA_SOURCE_MODE",
] as const;

console.log("▶ 환경변수 존재 여부 확인 (값은 출력하지 않음)\n");
for (const key of KEYS) {
  const value = process.env[key]?.trim();
  if (!value) {
    console.log(`  ❌ ${key} — 미설정`);
    continue;
  }
  // SUPPORT_PROVIDER / DATA_SOURCE_MODE는 값 자체가 설정값(mock/supabase 등)이라 노출해도 안전함.
  if (key === "SUPPORT_PROVIDER" || key === "DATA_SOURCE_MODE") {
    console.log(`  ✅ ${key} = ${value}`);
  } else {
    console.log(`  ✅ ${key} — 설정됨 (length=${value.length}, 앞 4자리=${value.slice(0, 4)}****)`);
  }
}
