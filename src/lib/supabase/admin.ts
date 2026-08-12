import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  hasServiceRoleConfig,
} from "./env";

/**
 * 서버 전용 Admin Client (service_role).
 * RLS 를 bypass 하므로 Route Handler / Server Action / 관리자 API 에서만 사용한다.
 * 클라이언트 컴포넌트에서 import 하면 안 된다.
 */
export function createAdminSupabaseClient(): SupabaseClient | null {
  if (!hasServiceRoleConfig()) return null;

  return createClient(getSupabaseUrl()!, getSupabaseServiceRoleKey()!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
