import { getCurrentUser } from "@/lib/auth/session";
import { SiteHeaderClient } from "./site-header-client";

/** Server Component: 로그인 상태를 조회해 Client 헤더에 전달한다 (Client UI 숨김이 아니라 실제 세션 기반). */
export async function SiteHeader() {
  const user = await getCurrentUser();
  return <SiteHeaderClient user={user ? { name: user.name, email: user.email, role: user.role } : null} />;
}
