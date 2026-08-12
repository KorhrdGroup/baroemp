/**
 * `next` 파라미터 보안 검증.
 *
 * 반드시 내부 라우트(`/`로 시작)만 허용한다.
 * `//evil.com`, `https://evil.com`, `/\evil.com` 같은 프로토콜 상대/외부 URL은 모두 차단한다.
 */
export function sanitizeNextPath(next: string | null | undefined, fallback = "/mypage"): string {
  if (!next) return fallback;

  let value: string;
  try {
    value = decodeURIComponent(next);
  } catch {
    return fallback;
  }

  if (!value.startsWith("/")) return fallback;
  // "//evil.com" 또는 "/\evil.com" 같은 프로토콜 상대 URL 차단
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // 개행/제어문자를 이용한 헤더 인젝션 방지
  if (/[\r\n\t]/.test(value)) return fallback;
  if (!/^\/[a-zA-Z0-9\-_/?=&%.#]*$/.test(value)) return fallback;

  return value;
}

export const PROTECTED_ROUTE_PREFIXES = [
  "/assessment",
  "/jobs",
  "/support",
  "/mypage",
  "/resume",
  "/cover-letter",
  "/experience-bank",
] as const;

export const ADMIN_ROUTE_PREFIX = "/admin";

export const AUTH_ROUTE_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_ROUTE_PREFIX || pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/`);
}

export function isAuthPath(pathname: string): boolean {
  return AUTH_ROUTE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function buildLoginRedirectUrl(pathname: string, search: string, base: string | URL): URL {
  const url = new URL("/login", base);
  const next = `${pathname}${search ?? ""}`;
  url.searchParams.set("next", next);
  return url;
}
