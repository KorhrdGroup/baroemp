import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, hasPublicSupabaseConfig } from "./env";

let browserClient: SupabaseClient | null = null;

/**
 * 브라우저(Client Component)용 Supabase Auth Client.
 * 쿠키 기반 세션을 사용해 서버(SSR)와 동일한 로그인 상태를 공유한다.
 * 환경변수가 없으면 null을 반환한다 (호출부에서 안전하게 처리).
 */
export function createBrowserSupabaseClient(): SupabaseClient | null {
  if (!hasPublicSupabaseConfig()) return null;

  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl()!, getSupabaseAnonKey()!);
  }

  return browserClient;
}
