"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSmsProvider } from "@/lib/sms";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { validateSignup } from "./signup-validation";
import { normalizePhone, phoneMatchCandidates } from "@/lib/utils/phone";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { ensureUserProfile, applyAcquisitionTouch } from "@/services/auth-identity.service";
import { linkAnonymousCareraDataToUserSafe } from "./anonymous-merge";
import { readAcquisitionCookiesServer } from "@/lib/acquisition/acquisition-cookies";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
}

/**
 * 이메일 미입력 회원의 내부 식별용 합성 이메일.
 * 실제 메일 발송 대상이 아니며, 전화번호 로그인 시 이 주소로 매핑된다.
 */
function syntheticEmailFromPhone(phoneDigits: string): string {
  return `p${phoneDigits}@member.baroemp.app`;
}

function extractPhoneDigits(input: string): string | null {
  const digits = input.replace(/[^0-9]/g, "");
  return /^01[016789][0-9]{7,8}$/.test(digits) ? digits : null;
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

  // 클라이언트 폼과 같은 규칙을 쓴다 (signup-validation).
  // 화면에서 막혔는데 서버는 통과하거나 그 반대인 상황을 만들지 않기 위해서다.
  const fieldErrors = validateSignup({
    name,
    email,
    password,
    passwordConfirm,
    phone: phoneRaw,
    privacyConsent,
  });

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  // 화면에서 휴대폰 인증을 마쳤는지 서버에서 다시 확인한다 (클라이언트 우회 방지).
  // SMS 미설정 개발 환경에서는 인증 없이 가입을 막지 않기 위해 provider 유무로 판단한다.
  const phoneVerificationId = String(formData.get("phoneVerificationId") ?? "");
  const smsEnabled = getSmsProvider() !== null && process.env.NODE_ENV === "production";
  if (smsEnabled) {
    const { consumePhoneVerification } = await import("@/services/phone-verification.service");
    const verified = await consumePhoneVerification({
      verificationId: phoneVerificationId,
      phone: phoneRaw,
      purpose: "signup",
    });
    if (!verified) {
      return { fieldErrors: { phone: "휴대폰 인증을 완료해주세요." } };
    }
  }

  await logActivityEvent({
    anonymousId: await getAnonymousIdFromCookie(),
    eventType: "signup_started",
    entityType: "career_profile",
    metadata: {},
  });

  const privacyConsentAt = new Date().toISOString();
  const phone = normalizePhone(phoneRaw);

  // 가입 직후에는 취업 프로필 입력을 한 번 보여주고, 저장하거나 건너뛰면 원래 목적지로 보낸다.
  // 이메일 인증이 필요한 경우에도 인증 링크가 이 경로로 돌아오도록 emailRedirectTo에 함께 넣는다.
  // welcome=1: 가입 직후로 들어온 표시. 나중에 마이페이지에서 이어서 할 때는 붙지 않는다.
  const afterSignUp = `/onboarding/profile?welcome=1&next=${encodeURIComponent(next)}`;

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    // Mock Mode: Supabase 미설정 시 실제 계정 없이 회원을 하나 만들고 가짜 세션으로 로그인시킨다.
    // 가입 이후 화면(온보딩·마이페이지)을 확인하기 위한 용도이며, 서버를 다시 띄우면 사라진다.
    const { findMockMemberByLoginEmail, registerMockMember } = await import("@/mocks/users.mock");
    if (findMockMemberByLoginEmail(email)) {
      return { fieldErrors: { email: "이미 가입된 이메일입니다." } };
    }
    const member = registerMockMember({
      name,
      email,
      phone,
      marketingConsent,
      joinedAt: privacyConsentAt.slice(0, 10),
    });
    const { createMockSession } = await import("@/lib/auth/mock-session");
    await createMockSession(email);
    await logActivityEvent({
      userId: member.id,
      eventType: "signup_completed",
      entityType: "career_profile",
      metadata: { hasPhone: Boolean(phone), marketingConsent, mock: true },
    });
    redirect(afterSignUp);
  }

  // 이메일 인증 없이 즉시 가입시킨다. 이메일 미입력 시 전화번호 기반 합성 이메일로 계정을 식별한다.
  const admin = createAdminSupabaseClient();
  if (!admin) {
    return { error: "회원가입 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }
  const accountEmail = email || syntheticEmailFromPhone(phone!);

  const { data: created, error } = await admin.auth.admin.createUser({
    email: accountEmail,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      phone,
      marketing_consent: marketingConsent,
      privacy_consent_at: privacyConsentAt,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || error.status === 422) {
      return email
        ? { fieldErrors: { email: "이미 가입된 이메일입니다." } }
        : { fieldErrors: { phone: "이미 가입된 휴대전화번호입니다." } };
    }
    return { error: "회원가입 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  const user = created.user;
  if (!user) {
    return { error: "회원가입 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  // 세션 쿠키 발급 (방금 만든 계정으로 즉시 로그인)
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: accountEmail, password });
  if (signInError) {
    return { error: "가입은 완료되었지만 자동 로그인에 실패했습니다. 로그인 화면에서 다시 시도해주세요." };
  }

  // 트리거(0033 migration)가 profiles 등을 생성하지만, 실패 대비 idempotent 검증을 수행한다.
  await ensureUserProfile({
    userId: user.id,
    email: email || undefined,
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

  await afterAuthSuccess(user.id);
  redirect(afterSignUp);
}

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const identifier = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  // 로그인 성공 후에는 늘 마이페이지로 보낸다. next 로 원래 있던 화면에 되돌려 보내면 회원이
  // 자기 상태(진행 절차·프로필)를 못 보고 넘어가서, 아직 안 한 다음 할 일을 놓친다.

  if (!identifier || !password) {
    return { error: "이메일(또는 휴대전화번호)과 비밀번호를 입력해주세요." };
  }

  // 휴대전화번호로 로그인: 이메일 없이 가입한 회원은 합성 이메일로, 이메일 회원은 프로필에서 이메일을 찾는다.
  let email = identifier;
  const phoneDigits = extractPhoneDigits(identifier);
  if (phoneDigits) {
    email = syntheticEmailFromPhone(phoneDigits);
    const admin = createAdminSupabaseClient();
    if (admin) {
      const { data: profileRow } = await admin
        .from("profiles")
        .select("email")
        .in("phone", phoneMatchCandidates(phoneDigits))
        .not("email", "is", null)
        .limit(1)
        .maybeSingle();
      if (profileRow?.email) email = String(profileRow.email);
    }
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    // Mock Mode: Supabase 미설정 시 아무 이메일/비밀번호로나 가짜 세션을 만들어 로그인시킨다.
    const { createMockSession } = await import("@/lib/auth/mock-session");
    await createMockSession(email);
    redirect("/mypage");
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

  redirect("/mypage");
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
