import "server-only";
import { cookies } from "next/headers";
import type { CurrentUser } from "./session";

/**
 * Mock Mode(NEXT_PUBLIC_SUPABASE_URL 미설정) 전용 가짜 로그인 세션.
 * Supabase 환경변수가 설정되면 이 코드는 어떤 경로에서도 호출되지 않는다.
 * 쿠키에는 이메일만 저장하며, 모든 사용자는 USER role로 로그인된다.
 */
const MOCK_SESSION_COOKIE = "baro-mock-session";

export async function readMockSessionUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const email = store.get(MOCK_SESSION_COOKIE)?.value?.trim();
  if (!email) return null;
  // 이메일이 admin으로 시작하면 관리자 화면 확인용으로 ADMIN 권한을 부여한다.
  const isAdmin = email.toLowerCase().startsWith("admin");
  const id = isAdmin ? "mock-admin-0001" : "mock-user-0001";
  const name = email.split("@")[0] || "테스트 사용자";
  return {
    id,
    email,
    name,
    role: isAdmin ? "ADMIN" : "USER",
    emailConfirmedAt: new Date().toISOString(),
  };
}

export async function createMockSession(email: string): Promise<void> {
  const store = await cookies();
  store.set(MOCK_SESSION_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1일
  });
}

export async function clearMockSession(): Promise<void> {
  const store = await cookies();
  store.delete(MOCK_SESSION_COOKIE);
}
