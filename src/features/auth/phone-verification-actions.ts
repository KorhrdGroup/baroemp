"use server";

import {
  sendPhoneVerificationCode,
  verifyPhoneCode,
} from "@/services/phone-verification.service";
import type { PhoneVerificationPurpose } from "@/types";

const VALID_PURPOSES: PhoneVerificationPurpose[] = ["signup", "find_id", "find_password"];

function isValidPurpose(value: string): value is PhoneVerificationPurpose {
  return (VALID_PURPOSES as string[]).includes(value);
}

export async function sendPhoneCodeAction(input: {
  phone: string;
  purpose: PhoneVerificationPurpose;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isValidPurpose(input.purpose)) return { ok: false, error: "잘못된 요청입니다." };
  const result = await sendPhoneVerificationCode(input);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function verifyPhoneCodeAction(input: {
  phone: string;
  code: string;
  purpose: PhoneVerificationPurpose;
}): Promise<{ ok: boolean; verificationId?: string; error?: string }> {
  if (!isValidPurpose(input.purpose)) return { ok: false, error: "잘못된 요청입니다." };
  const result = await verifyPhoneCode(input);
  return result.ok
    ? { ok: true, verificationId: result.verificationId }
    : { ok: false, error: result.error };
}
