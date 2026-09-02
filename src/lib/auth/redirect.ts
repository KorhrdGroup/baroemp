/**
 * `next` 파라미터 보안 검증.
 *
 * 반드시 내부 라우트(`/`로 시작)만 허용한다.
 * `//evil.com`, `https://evil.com`, `/\evil.com` 같은 프로토콜 상대/외부 URL은 모두 차단한다.
 */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
/** 경로 우회(역슬래시)와 마크업/속성 이탈에 쓰이는 문자 */
const UNSAFE_CHARS = /[\\<>"']/;

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
  /*
   * 예전에는 ASCII 화이트리스트로 걸렀는데, next에 한글이 들어오면
   * (예: /jobs?keyword=요양) 통째로 fallback으로 떨어져 로그인 후 엉뚱한 곳으로 갔다.
   * 허용 문자를 열거하는 대신 위험한 문자만 막는다.
   * 외부 도메인으로 나가는 건 위의 "/" 검사가 이미 차단한다.
   */
  if (CONTROL_CHARS.test(value) || UNSAFE_CHARS.test(value)) return fallback;

  return value;
}

export const PROTECTED_ROUTE_PREFIXES = [
  "/assessment",
  "/jobs",
  "/support",
  "/mypage",
  "/resume",
  "/cover-letter",
] as const;

export const ADMIN_ROUTE_PREFIX = "/admin";

export const AUTH_ROUTE_PATHS = ["/login", "/signup", "/find-id", "/find-password"] as const;

/**
 * 보호 접두사에 속하지만 비로그인도 볼 수 있는 경로.
 * 소개 화면까지 막으면 서비스가 무엇인지 확인할 방법이 없어 유입이 끊긴다.
 * 실제 시작(세션 생성)은 각 페이지에서 여전히 로그인을 요구한다.
 *
 * /jobs 는 목록 첫 화면까지 열어 둔다 - 어떤 공고가 있는지 못 보면 가입할 이유도 생기지 않는다.
 * 공고 상세(/jobs/{id})와 두 번째 쪽부터는 페이지에서 다시 로그인을 요구한다.
 */
const PUBLIC_LANDING_PATHS: readonly string[] = ["/assessment", "/support", "/jobs"];

export function isProtectedPath(pathname: string): boolean {
  if (PUBLIC_LANDING_PATHS.includes(pathname)) return false;
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
