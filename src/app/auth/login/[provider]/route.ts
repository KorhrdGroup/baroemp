import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { buildAuthorizeUrl, isSocialProvider, isSocialProviderConfigured } from "@/lib/auth/social-oauth";
import { sanitizeNextPath } from "@/lib/auth/redirect";

/** 소셜 로그인 시작점: state 쿠키를 심고 provider 인증 페이지로 보낸다. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isSocialProvider(provider)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!isSocialProviderConfigured(provider)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "social_not_configured");
    return NextResponse.redirect(url);
  }

  const next = sanitizeNextPath(request.nextUrl.searchParams.get("next") ?? "", "/mypage");
  const state = randomBytes(16).toString("hex");
  const redirectUri = `${request.nextUrl.origin}/auth/callback/${provider}`;

  const response = NextResponse.redirect(buildAuthorizeUrl(provider, redirectUri, state));
  response.cookies.set(`social_state_${provider}`, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  response.cookies.set(`social_next_${provider}`, next, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
