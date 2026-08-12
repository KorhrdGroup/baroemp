import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { AppRole } from "@/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ADMIN_ROLES, STAFF_ROLES } from "./roles";

/**
 * isAdminRole/isStaffRole은 Client Component에서도 안전하게 써야 하므로 ./roles로 분리했다.
 * 기존 호출부(`from "@/lib/auth/session"`)가 계속 동작하도록 여기서 re-export한다.
 */
export { isAdminRole, isStaffRole } from "./roles";

export interface CurrentUser {
  id: string;
  email?: string;
  name?: string;
  role: AppRole;
  emailConfirmedAt?: string | null;
}

/**
 * 현재 로그인 사용자를 조회한다 (DAL - Data Access Layer).
 *
 * - Supabase Auth 세션(쿠키)에서 auth.getUser()로 사용자를 확인한다 (JWT 검증, stale 쿠키 아님).
 * - profiles 조회는 authenticated 클라이언트로 수행한다 (RLS: auth.uid() = id 정책이 실제로 적용됨).
 * - React cache()로 한 요청(render pass) 내 중복 조회를 방지한다.
 *
 * 이 함수는 절대 client-supplied userId를 신뢰하지 않는다 - 오직 세션 쿠키만 신뢰한다.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? undefined,
    name: (profile?.name as string | null) ?? undefined,
    role: (profile?.role as AppRole | undefined) ?? "USER",
    emailConfirmedAt: user.email_confirmed_at ?? null,
  };
});

/**
 * Server Action(찜, 프로필 수정 등)에서 사용. 페이지 리다이렉트가 아니라 에러를 던진다
 * (Server Action은 네비게이션이 아니므로 redirect()가 적절하지 않다).
 * 클라이언트가 임의의 userId를 파라미터로 넘겨 다른 사용자의 데이터를 조작/조회하는 것을 막기 위해
 * 모든 회원 전용 Server Action은 userId를 파라미터로 받지 않고 이 함수로 세션에서 직접 도출해야 한다.
 */
export async function requireSessionUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다.");
  return user;
}

/** 보호 Route에서 사용. 비로그인 시 /login?next=로 리다이렉트한다 (Server Component 전용). */
export async function requireUser(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const suffix = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${suffix}`);
  }
  return user;
}

/**
 * 관리자 Route Server Guard. 반드시 실제 DB role을 조회해서 검사한다 (Client 메뉴 숨김만으로 처리하지 않음).
 * - 비로그인: /login으로 리다이렉트
 * - ADMIN/SUPER_ADMIN이 아닌 로그인 사용자(USER 포함): null을 반환 (호출부인 admin/layout.tsx가
 *   같은 /admin/** 트리 내부로 redirect하면 무한 루프가 생기므로, 여기서는 redirect하지 않고
 *   "권한 없음" 상태를 그대로 반환해 레이아웃이 안내 화면을 렌더링하게 한다).
 */
export async function requireAdmin(nextPath?: string): Promise<CurrentUser | null> {
  const user = await requireUser(nextPath);
  if (!ADMIN_ROLES.includes(user.role)) {
    return null;
  }
  return user;
}

/** ADMIN/SUPER_ADMIN/CONSULTANT까지 허용하는 "staff" 검사 (현재는 admin과 동일 범위로 제한, 필요 시 세분화). */
export async function requireStaff(nextPath?: string): Promise<CurrentUser | null> {
  const user = await requireUser(nextPath);
  if (!STAFF_ROLES.includes(user.role)) {
    return null;
  }
  return user;
}
