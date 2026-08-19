"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { normalizePhone, isValidKoreanPhone } from "@/lib/utils/phone";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { ensureUserProfile, applyAcquisitionTouch } from "@/services/auth-identity.service";
import { linkAnonymousCareraDataToUserSafe } from "./anonymous-merge";
import { readAcquisitionCookiesServer } from "@/lib/acquisition/acquisition-cookies";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
}

async function getOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function getAnonymousIdFromCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get("baro_anonymous_id")?.value || undefined;
}

/** 로그인/회원가입 성공 직후 공통 마무리 작업: anonymous 데이터 병합 + last_active_at 갱신은 profile UPDATE 트리거에 위임. */
async function afterAuthSuccess(userId: string): Promise<void> {
  const anonymousId = await getAnonymousIdFromCookie();
  if (anonymousId) {
    await linkAnonymousCareraDataToUserSafe(anonymousId, userId);
  }
}

export interface SignUpFormState extends AuthFormState {
  emailConfirmationRequired?: boolean;
}

export async function signUpAction(_prev: SignUpFormState, formData: FormData): Promise<SignUpFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const privacyConsent = formData.get("privacyConsent") === "on" || formData.get("privacyConsent") === "true";
  const marketingConsent = formData.get("marketingConsent") === "on" || formData.get("marketingConsent") === "true";
  const next = sanitizeNextPath(String(formData.get("next") ?? ""), "/mypage");

  const fieldErrors: Record<string, string> = {};
  if (!name || name.length < 2) fieldErrors.name = "이름을 2자 이상 입력해주세요.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "올바른 이메일 형식이 아닙니다.";
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    fieldErrors.password = "비밀번호는 영문/숫자를 포함해 8자 이상이어야 합니다.";
  }
  if (password !== passwordConfirm) fieldErrors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
  if (!privacyConsent) fieldErrors.privacyConsent = "개인정보 수집·이용에 동의해야 가입할 수 있습니다.";
  if (phoneRaw && !isValidKoreanPhone(phoneRaw)) fieldErrors.phone = "휴대전화번호 형식을 확인해주세요.";

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: "회원가입 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해주세요." };
  }

  await logActivityEvent({
    anonymousId: await getAnonymousIdFromCookie(),
    eventType: "signup_started",
    entityType: "career_profile",
    metadata: {},
  });

  const origin = await getOrigin();
  const privacyConsentAt = new Date().toISOString();
  const phone = normalizePhone(phoneRaw);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone,
        marketing_consent: marketingConsent,
        privacy_consent_at: privacyConsentAt,
      },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered") || error.status === 422) {
      return { fieldErrors: { email: "이미 가입된 이메일입니다." } };
    }
    return { error: "회원가입 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  const user = data.user;
  if (!user) {
    return { error: "회원가입 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  // 트리거(0033 migration)가 profiles 등을 생성하지만, 실패 대비 idempotent 검증을 수행한다.
  await ensureUserProfile({
    userId: user.id,
    email,
    name,
    phone,
    marketingConsent,
    privacyConsentAt,
  });

  const cookieStore = await cookies();
  const { firstTouch, lastTouch } = readAcquisitionCookiesServer((n) => cookieStore.get(n)?.value);
  await applyAcquisitionTouch({ userId: user.id, firstTouch, lastTouch });

  await logActivityEvent({
    userId: user.id,
    eventType: "signup_completed",
    entityType: "career_profile",
    metadata: { hasPhone: Boolean(phone), marketingConsent },
  });

  const hasSession = Boolean(data.session);
  if (hasSession) {
    await afterAuthSuccess(user.id);
    redirect(next);
  }

  return {
    message: "인증메일을 발송했습니다. 이메일 인증 후 서비스를 이용할 수 있습니다.",
    emailConfirmationRequired: true,
  };
}

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = sanitizeNextPath(String(formData.get("next") ?? ""), "/mypage");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해주세요." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    // Mock Mode: Supabase 미설정 시 아무 이메일/비밀번호로나 가짜 세션을 만들어 로그인시킨다.
    const { createMockSession } = await import("@/lib/auth/mock-session");
    await createMockSession(email);
    redirect(next);
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  await ensureUserProfile({ userId: data.user.id, email });

  await supabase
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", data.user.id);

  await logActivityEvent({
    userId: data.user.id,
    eventType: "login_completed",
    entityType: "career_profile",
    metadata: {},
  });

  await afterAuthSuccess(data.user.id);

  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    const { clearMockSession } = await import("@/lib/auth/mock-session");
    await clearMockSession();
  }
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await logActivityEvent({ userId: data.user.id, eventType: "logout", entityType: "career_profile", metadata: {} });
    }
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function requestPasswordResetAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { fieldErrors: { email: "올바른 이메일 형식이 아닙니다." } };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: "비밀번호 재설정 서비스를 사용할 수 없습니다." };
  }

  const origin = await getOrigin();
  // 존재하지 않는 이메일이라도 동일한 안내를 보여준다 (이메일 존재 여부 노출 방지).
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?type=recovery&next=${encodeURIComponent("/reset-password")}`,
  });

  await logActivityEvent({
    eventType: "password_reset_requested",
    entityType: "career_profile",
    metadata: {},
  });

  return { message: "비밀번호 재설정 메일을 발송했습니다. 메일함을 확인해주세요." };
}

export async function updatePasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { fieldErrors: { password: "비밀번호는 영문/숫자를 포함해 8자 이상이어야 합니다." } };
  }
  if (password !== passwordConfirm) {
    return { fieldErrors: { passwordConfirm: "비밀번호가 일치하지 않습니다." } };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: "비밀번호 변경 서비스를 사용할 수 없습니다." };
  }

  const { data: sessionData } = await supabase.auth.getUser();
  if (!sessionData.user) {
    return { error: "인증 링크가 만료되었습니다. 비밀번호 재설정을 다시 요청해주세요." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "비밀번호 변경 중 문제가 발생했습니다. 다시 시도해주세요." };
  }

  return { message: "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요." };
}
