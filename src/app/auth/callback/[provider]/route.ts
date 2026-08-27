import { NextResponse, type NextRequest } from "next/server";
import {
  isSocialProvider,
  resolveSocialProfile,
  signInWithSocialProfile,
} from "@/lib/auth/social-oauth";
import { sanitizeNextPath } from "@/lib/auth/redirect";

function loginWithError(request: NextRequest, code: string): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url);
}

/** 소셜 로그인 콜백: code 교환 → 프로필 조회 → 회원 확보 → 세션 발급 → 이동. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isSocialProvider(provider)) return NextResponse.redirect(new URL("/login", request.url));

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError || !code) return loginWithError(request, "social_cancelled");

  const savedState = request.cookies.get(`social_state_${provider}`)?.value;
  if (!savedState || savedState !== state) return loginWithError(request, "social_state_mismatch");

  const redirectUri = `${request.nextUrl.origin}/auth/callback/${provider}`;
  const profile = await resolveSocialProfile(provider, code, redirectUri, state);
  if (!profile) return loginWithError(request, "social_profile_failed");

  const result = await signInWithSocialProfile(profile);
  if (!result) return loginWithError(request, "social_signin_failed");

  const next = sanitizeNextPath(request.cookies.get(`social_next_${provider}`)?.value ?? "", "/mypage");
  const target = result.isNewUser ? `/onboarding/profile?next=${encodeURIComponent(next)}` : next;

  const response = NextResponse.redirect(new URL(target, request.url));
  response.cookies.delete(`social_state_${provider}`);
  response.cookies.delete(`social_next_${provider}`);
  return response;
}
