import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/services/auth-identity.service";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { normalizePhone } from "@/lib/utils/phone";

/**
 * 네이버·카카오 소셜 로그인 (자체 OAuth 구현).
 *
 * Supabase의 기본 provider 목록에 네이버가 없어 두 provider 모두 동일한 자체 흐름을 쓴다:
 *  1) /auth/login/{provider}  → state 쿠키 발급 후 provider 인증 페이지로 리다이렉트
 *  2) /auth/callback/{provider} → code 교환 → 프로필 조회 → 계정 확보 → 세션 발급
 *
 * 계정 식별: provider 고유 ID 기반 합성 이메일(nv{id}@social.baroemp.app 등).
 * 수집 항목은 이름·휴대전화번호만 사용한다 (2026-08 확정 정책).
 */

export type SocialProvider = "naver" | "kakao";

export interface SocialProfile {
  provider: SocialProvider;
  providerId: string;
  name?: string;
  phone?: string;
}

export function isSocialProvider(value: string): value is SocialProvider {
  return value === "naver" || value === "kakao";
}

export function isSocialProviderConfigured(provider: SocialProvider): boolean {
  if (provider === "naver") return Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
  return Boolean(process.env.KAKAO_REST_API_KEY);
}

export function buildAuthorizeUrl(provider: SocialProvider, redirectUri: string, state: string): string {
  if (provider === "naver") {
    const url = new URL("https://nid.naver.com/oauth2.0/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", process.env.NAVER_CLIENT_ID!);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  }
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.KAKAO_REST_API_KEY!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

/** 토큰 교환 결과. 실패하면 provider 가 준 오류 코드(KOE010 등)를 함께 돌려 화면·로그에 쓴다. */
interface TokenExchange {
  token: string | null;
  reason?: string;
}

async function exchangeCodeForToken(
  provider: SocialProvider,
  code: string,
  redirectUri: string,
  state: string,
): Promise<TokenExchange> {
  if (provider === "naver") {
    const url = new URL("https://nid.naver.com/oauth2.0/token");
    url.searchParams.set("grant_type", "authorization_code");
    url.searchParams.set("client_id", process.env.NAVER_CLIENT_ID!);
    url.searchParams.set("client_secret", process.env.NAVER_CLIENT_SECRET!);
    url.searchParams.set("code", code);
    url.searchParams.set("state", state);
    const res = await fetch(url, { cache: "no-store" });
    const json = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
    if (!json.access_token) {
      console.error("[social-oauth] naver token exchange failed", {
        status: res.status,
        error: json.error,
        description: json.error_description,
      });
    }
    return { token: json.access_token ?? null, reason: json.error };
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.KAKAO_REST_API_KEY!,
    redirect_uri: redirectUri,
    code,
  });
  if (process.env.KAKAO_CLIENT_SECRET) body.set("client_secret", process.env.KAKAO_CLIENT_SECRET);
  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
    cache: "no-store",
  });
  const json = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
    error_code?: string;
  };
  if (!json.access_token) {
    // 실패 이유를 버리면 콜백은 social_profile_failed 한 줄만 남아 원인을 알 수 없다.
    // access_token은 찍지 않는다 - 실패 응답에는 애초에 없다.
    console.error("[social-oauth] kakao token exchange failed", {
      status: res.status,
      error: json.error,
      errorCode: json.error_code,
      description: json.error_description,
      redirectUri,
      hasClientSecret: Boolean(process.env.KAKAO_CLIENT_SECRET),
    });
  }
  // KOE010(Bad client credentials): 카카오 앱에 Client Secret 이 켜져 있는데 서버에 KAKAO_CLIENT_SECRET 이 없거나 REST 키가 틀림.
  // KOE303: redirect_uri 가 카카오 콘솔에 등록된 것과 다름. KOE320: code 만료·재사용.
  return { token: json.access_token ?? null, reason: json.error_code ?? json.error };
}

async function fetchSocialProfile(provider: SocialProvider, accessToken: string): Promise<SocialProfile | null> {
  if (provider === "naver") {
    const res = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const json = (await res.json()) as {
      resultcode?: string;
      response?: { id?: string; name?: string; mobile?: string };
    };
    if (json.resultcode !== "00" || !json.response?.id) return null;
    return {
      provider,
      providerId: json.response.id,
      name: json.response.name,
      phone: normalizePhone(json.response.mobile),
    };
  }
  const res = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const json = (await res.json()) as {
    id?: number;
    msg?: string;
    code?: number;
    kakao_account?: { name?: string; phone_number?: string; profile?: { nickname?: string } };
  };
  if (!json.id) {
    console.error("[social-oauth] kakao profile fetch failed", {
      status: res.status,
      code: json.code,
      msg: json.msg,
    });
    return null;
  }
  // 카카오 전화번호는 "+82 10-1234-5678" 형태 → 국내 표기로 변환
  const rawPhone = json.kakao_account?.phone_number?.replace(/^\+82\s?/, "0");
  return {
    provider,
    providerId: String(json.id),
    name: json.kakao_account?.name ?? json.kakao_account?.profile?.nickname,
    phone: normalizePhone(rawPhone),
  };
}

export interface SocialProfileResolution {
  profile: SocialProfile | null;
  /** 실패했을 때 provider 오류 코드. 화면에 "(오류 코드 KOE010)" 처럼 붙여 원인을 찾게 한다. */
  reason?: string;
}

export async function resolveSocialProfile(
  provider: SocialProvider,
  code: string,
  redirectUri: string,
  state: string,
): Promise<SocialProfileResolution> {
  const { token, reason } = await exchangeCodeForToken(provider, code, redirectUri, state);
  if (!token) return { profile: null, reason: reason ?? "token" };
  const profile = await fetchSocialProfile(provider, token);
  return { profile, reason: profile ? undefined : "profile" };
}

function socialAccountEmail(profile: SocialProfile): string {
  const prefix = profile.provider === "naver" ? "nv" : "kk";
  return `${prefix}${profile.providerId.toLowerCase().replace(/[^a-z0-9]/g, "")}@social.baroemp.app`;
}

/**
 * 소셜 프로필로 회원을 확보하고 현재 요청에 세션 쿠키를 발급한다.
 * @returns isNewUser - 이번에 새로 가입된 회원인지 (온보딩 이동 판단용)
 */
export async function signInWithSocialProfile(profile: SocialProfile): Promise<{ isNewUser: boolean } | null> {
  const admin = createAdminSupabaseClient();
  const supabase = await createServerSupabaseClient();
  if (!admin || !supabase) return null;

  const email = socialAccountEmail(profile);
  let isNewUser = false;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      name: profile.name,
      phone: profile.phone,
      social_provider: profile.provider,
      social_provider_id: profile.providerId,
    },
  });

  let userId = created?.user?.id;
  if (createError) {
    const already = createError.message.toLowerCase().includes("already") || createError.status === 422;
    if (!already) return null;
  } else {
    isNewUser = true;
  }

  // 세션 발급: magiclink 토큰을 서버에서 생성해 즉시 검증한다 (메일 발송 없음).
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError || !linkData.properties?.hashed_token) return null;
  if (!userId) userId = linkData.user?.id;

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });
  if (verifyError || !userId) return null;

  await ensureUserProfile({
    userId,
    name: profile.name,
    phone: profile.phone,
  });

  await logActivityEvent({
    userId,
    eventType: isNewUser ? "signup_completed" : "login_completed",
    entityType: "career_profile",
    metadata: { socialProvider: profile.provider, hasPhone: Boolean(profile.phone) },
  });

  return { isNewUser };
}
