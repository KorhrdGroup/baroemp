import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Supabase Auth 이메일 링크(회원가입 인증, 비밀번호 재설정) 공통 콜백.
 *
 * Supabase 대시보드 > Authentication > Email Templates에서 "Confirm signup"/"Reset password"
 * 링크를 다음 형태로 설정해야 한다 (README 참고):
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next=/mypage
 *
 * type=signup|email → 이메일 인증 완료 후 세션 생성, next로 이동.
 * type=recovery → 비밀번호 재설정 세션 생성 후 /reset-password로 이동해 새 비밀번호 입력.
 *
 * PKCE 방식(?code=...)으로 오는 경우도 함께 처리한다 (Supabase 프로젝트 Auth Flow 설정에 따라 다름).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"), type === "recovery" ? "/reset-password" : "/mypage");

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=service_unavailable", origin));
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=invalid_link", origin));
}
