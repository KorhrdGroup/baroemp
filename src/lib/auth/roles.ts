import type { AppRole } from "@/types";

/**
 * 역할 판정 순수 함수 모음.
 *
 * `session.ts`와 분리한 이유: `session.ts`는 `server-only` + `next/headers`(cookies())에
 * 의존하므로 Client Component에서 import하면 빌드가 깨진다("use client" 컴포넌트인
 * site-header-client.tsx가 관리자 메뉴 노출 여부를 판단하려고 isAdminRole()만 필요한 경우에도
 * session.ts 전체를 끌어오면서 next/headers까지 클라이언트 번들에 섞여 들어가는 문제).
 * 이 파일은 순수 함수만 담아 Client/Server 어디서나 안전하게 import할 수 있게 한다.
 */
export const ADMIN_ROLES: AppRole[] = ["ADMIN", "SUPER_ADMIN"];
export const STAFF_ROLES: AppRole[] = ["ADMIN", "SUPER_ADMIN", "CONSULTANT"];

export function isAdminRole(role: AppRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isStaffRole(role: AppRole): boolean {
  return STAFF_ROLES.includes(role);
}
