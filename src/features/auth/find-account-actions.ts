"use server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { normalizePhone } from "@/lib/utils/phone";
import { consumePhoneVerification } from "@/services/phone-verification.service";

/** 이메일 아이디 마스킹은 서버에서만 수행한다 (원본 이메일을 클라이언트로 내려보내지 않는다). */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "****";
  const head = local.slice(0, Math.min(4, local.length));
  return `${head}${"*".repeat(Math.max(local.length - head.length, 3))}@${domain}`;
}

export async function findIdAction(input: {
  name: string;
  phone: string;
  verificationId: string;
}): Promise<{ ok: boolean; maskedEmail?: string; joinedAt?: string; error?: string }> {
  const phone = normalizePhone(input.phone);
  const name = input.name.trim();
  if (!phone || !name) return { ok: false, error: "이름과 휴대전화번호를 입력해주세요." };

  const verified = await consumePhoneVerification({
    verificationId: input.verificationId,
    phone,
    purpose: "find_id",
  });
  if (!verified) return { ok: false, error: "휴대폰 인증을 다시 진행해주세요." };

  const admin = createAdminSupabaseClient();
  if (!admin) return { ok: false, error: "아이디 찾기 서비스를 사용할 수 없습니다." };

  const { data } = await admin
    .from("profiles")
    .select("email, created_at")
    .eq("phone", phone)
    .eq("name", name)
    .not("email", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data?.email) return { ok: false, error: "일치하는 회원 정보를 찾을 수 없습니다." };

  await logActivityEvent({ eventType: "find_id_completed", entityType: "career_profile", metadata: {} });

  return {
    ok: true,
    maskedEmail: maskEmail(String(data.email)),
    joinedAt: String(data.created_at).slice(0, 10),
  };
}

export async function resetPasswordWithPhoneAction(input: {
  email: string;
  phone: string;
  verificationId: string;
  password: string;
  passwordConfirm: string;
}): Promise<{ ok: boolean; error?: string }> {
  const email = input.email.trim().toLowerCase();
  const phone = normalizePhone(input.phone);
  if (!email || !phone) return { ok: false, error: "아이디와 휴대전화번호를 입력해주세요." };
  if (input.password.length < 8 || !/[a-zA-Z]/.test(input.password) || !/[0-9]/.test(input.password)) {
    return { ok: false, error: "비밀번호는 영문/숫자를 포함해 8자 이상이어야 합니다." };
  }
  if (input.password !== input.passwordConfirm) {
    return { ok: false, error: "비밀번호가 일치하지 않습니다." };
  }

  const verified = await consumePhoneVerification({
    verificationId: input.verificationId,
    phone,
    purpose: "find_password",
  });
  if (!verified) return { ok: false, error: "휴대폰 인증을 다시 진행해주세요." };

  const admin = createAdminSupabaseClient();
  if (!admin) return { ok: false, error: "비밀번호 재설정 서비스를 사용할 수 없습니다." };

  // 이메일과 휴대전화번호가 같은 회원의 것인지 반드시 함께 확인한다.
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .eq("phone", phone)
    .limit(1)
    .maybeSingle();

  if (!profile?.id) return { ok: false, error: "일치하는 회원 정보를 찾을 수 없습니다." };

  const { error } = await admin.auth.admin.updateUserById(String(profile.id), {
    password: input.password,
  });
  if (error) {
    console.error("[find-account] 비밀번호 변경 실패", error);
    return { ok: false, error: "비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  await logActivityEvent({
    userId: String(profile.id),
    eventType: "password_reset_completed",
    entityType: "career_profile",
    metadata: { via: "phone" },
  });

  return { ok: true };
}

export async function checkEmailAvailableAction(
  email: string,
): Promise<{ available: boolean; error?: string }> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { available: false, error: "올바른 이메일 형식이 아닙니다." };
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    // Mock Mode: 실제 계정 저장소가 없으므로 항상 사용 가능으로 응답한다.
    return { available: true };
  }

  const { data } = await admin.from("profiles").select("id").eq("email", normalized).limit(1).maybeSingle();
  return { available: !data?.id };
}
