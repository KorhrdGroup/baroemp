import { hasPublicSupabaseConfig } from "@/lib/supabase/env";

export type DataSourceMode = "mock" | "supabase";

/**
 * 데이터 소스 모드 결정.
 * - `DATA_SOURCE_MODE=mock|supabase` 로 강제 가능 (권장 표기)
 * - 하위호환: 기존 `DATA_SOURCE` 도 동일하게 인식한다.
 * - 미설정 시 Supabase public env 가 있으면 supabase, 없으면 mock
 */
export function getDataSourceMode(): DataSourceMode {
  const forced = (process.env.DATA_SOURCE_MODE ?? process.env.DATA_SOURCE)?.trim().toLowerCase();
  if (forced === "mock" || forced === "supabase") {
    return forced;
  }
  return hasPublicSupabaseConfig() ? "supabase" : "mock";
}

export function isMockMode(): boolean {
  return getDataSourceMode() === "mock";
}

export function isSupabaseMode(): boolean {
  return getDataSourceMode() === "supabase";
}

/**
 * 운영환경 여부.
 * 운영환경 + Supabase Mode 에서는 클라이언트 생성/쿼리 실패 시
 * Mock 폴백 대신 명시적 에러(DataSourceError)를 던진다.
 */
export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_FALLBACK_IN_PRODUCTION !== "true";
}
