import { NextResponse, type NextRequest } from "next/server";
import {
  isSocialProvider,
  resolveSocialProfile,
  signInWithSocialProfile,
} from "@/lib/auth/social-oauth";
import { sanitizeNextPath } from "@/lib/auth/redirect";

function loginWithError(request: NextRequest, code: string, detail?: { provider?: string; reason?: string }): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", code);
  if (detail?.provider) url.searchParams.set("provider", detail.provider);
  if (detail?.reason) url.searchParams.set("reason", detail.reason);
  return NextResponse.redirect(url);
}

/** 소셜 로그인 콜백: code 교환 → 프로필 조회 → 회원 확보 → 세션 발급 → 이동. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isSocialProvider(provider)) return NextResponse.redirect(new URL("/login", request.url));

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError || !code) return loginWithError(request, "social_cancelled", { provider });

  const savedState = request.cookies.get(`social_state_${provider}`)?.value;
  if (!savedState || savedState !== state) return loginWithError(request, "social_state_mismatch", { provider });

  const redirectUri = `${request.nextUrl.origin}/auth/callback/${provider}`;
  const { profile, reason } = await resolveSocialProfile(provider, code, redirectUri, state);
  if (!profile) return loginWithError(request, "social_profile_failed", { provider, reason });

  const result = await signInWithSocialProfile(profile);
  if (!result) return loginWithError(request, "social_signin_failed", { provider });

  const next = sanitizeNextPath(request.cookies.get(`social_next_${provider}`)?.value ?? "", "/mypage");
  // 신규 소셜 가입은 가입 화면의 [선택] 알림톡 동의를 거치지 않으므로, 온보딩 앞에서 한 번 묻는다 (consent=1).
  const target = result.isNewUser ? `/onboarding/profile?next=${encodeURIComponent(next)}&consent=1` : next;

  const response = NextResponse.redirect(new URL(target, request.url));
  response.cookies.delete(`social_state_${provider}`);
  response.cookies.delete(`social_next_${provider}`);
  return response;
}
