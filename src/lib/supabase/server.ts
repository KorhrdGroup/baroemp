import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl, hasPublicSupabaseConfig } from "./env";

/**
 * 서버(Server Component/Server Action/Route Handler)용 Supabase Auth Client.
 * Next.js `cookies()`로 세션 쿠키를 읽고/쓴다.
 *
 * Server Component 렌더링 중에는 쿠키를 쓸 수 없으므로 setAll 호출이 실패할 수 있다.
 * 이 경우 proxy.ts가 매 요청마다 세션을 갱신하므로 무시해도 안전하다 (Supabase 공식 패턴).
 *
 * Service Role Key는 절대 여기에 넣지 않는다 (관리자 작업은 admin.ts만 사용).
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient | null> {
  if (!hasPublicSupabaseConfig()) return null;

  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component 렌더링 중 호출된 경우 - proxy.ts의 세션 갱신에 위임한다.
        }
      },
    },
  });
}
