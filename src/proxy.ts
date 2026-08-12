import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { captureAcquisitionTouch } from "@/lib/acquisition/acquisition-cookies";
import { buildLoginRedirectUrl, isAdminPath, isAuthPath, isProtectedPath } from "@/lib/auth/redirect";
import { getSupabaseAnonKey, getSupabaseUrl, hasPublicSupabaseConfig } from "@/lib/supabase/env";

/**
 * Next.js 16 Proxy (구 middleware).
 *
 * 이 파일은 "낙관적(optimistic) 검사"만 수행한다:
 * - Supabase 세션 쿠키를 갱신한다 (auth.getUser()).
 * - 로그인 필요 Route(/assessment, /jobs, /support, /mypage)에 비로그인 접근 시 /login?next=로 리다이렉트.
 * - 관리자 Route(/admin/**)는 "로그인 여부"까지만 여기서 걸러내고, 실제 role 검사는
 *   각 페이지의 Server Component(requireAdmin())에서 DB를 조회해 수행한다
 *   (Next.js 공식 가이드: Proxy에서 DB 조회를 하지 않는다).
 * - 로그인 상태로 /login, /signup 접근 시 next 파라미터 또는 기본 페이지로 되돌린다.
 * - UTM 유입 정보를 first/last-touch 쿠키에 캡처한다 (회원가입 시 user_acquisition에 반영).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;

  if (!hasPublicSupabaseConfig()) {
    // Supabase 환경변수가 없는 개발 초기 상태 - Auth 검사를 건너뛴다 (Mock Mode 호환).
    captureAcquisitionTouch(request, response);
    return response;
  }

  const supabase = createServerClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // createServerClient와 auth.getUser() 사이에 다른 로직을 넣지 않는다 (세션 갱신 실패 방지, 공식 권고).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedPath(pathname) && !user) {
    return NextResponse.redirect(buildLoginRedirectUrl(pathname, request.nextUrl.search, request.url));
  }

  if (isAdminPath(pathname) && !user) {
    return NextResponse.redirect(buildLoginRedirectUrl(pathname, request.nextUrl.search, request.url));
  }

  if (isAuthPath(pathname) && user) {
    const next = request.nextUrl.searchParams.get("next");
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/mypage";
    return NextResponse.redirect(new URL(target, request.url));
  }

  captureAcquisitionTouch(request, response);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
