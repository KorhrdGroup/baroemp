import { createHash, randomInt } from "node:crypto";
import { getPhoneVerificationRepository } from "@/lib/repositories";
import { getSmsProvider } from "@/lib/sms";
import { isValidKoreanPhone, normalizePhone } from "@/lib/utils/phone";
import type { PhoneVerificationPurpose } from "@/types";

const CODE_TTL_MS = 3 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5;

/** 코드 원문은 저장하지 않는다. 번호를 섞어 같은 코드라도 번호가 다르면 해시가 달라지게 한다. */
function hashCode(code: string, phone: string): string {
  return createHash("sha256").update(`${code}:${phone}`).digest("hex");
}

/** 개발/테스트에서만 쓰는 최근 발급 코드 조회 (검증 스크립트용). 운영 코드 경로에서는 호출하지 않는다. */
const lastIssuedCodes = new Map<string, string>();
export function __testOnlyPeekCode(phone: string, purpose: PhoneVerificationPurpose): string | undefined {
  return lastIssuedCodes.get(`${normalizePhone(phone)}:${purpose}`);
}

export async function sendPhoneVerificationCode(input: {
  phone: string;
  purpose: PhoneVerificationPurpose;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const phone = normalizePhone(input.phone);
  if (!phone || !isValidKoreanPhone(phone)) {
    return { ok: false, error: "올바른 휴대전화번호를 입력해주세요." };
  }

  const provider = getSmsProvider();
  if (!provider) {
    return { ok: false, error: "휴대폰 인증 서비스가 준비 중입니다." };
  }

  const repo = getPhoneVerificationRepository();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  if ((await repo.countSendsSince(phone, since)) >= MAX_SENDS_PER_HOUR) {
    return { ok: false, error: "인증번호 발송 횟수를 초과했습니다. 잠시 후 다시 시도해주세요." };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await repo.create({
    phone,
    purpose: input.purpose,
    codeHash: hashCode(code, phone),
    expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  lastIssuedCodes.set(`${phone}:${input.purpose}`, code);

  try {
    await provider.sendVerificationCode(phone, code);
  } catch (error) {
    console.error("[phone-verification] SMS 발송 실패", error);
    return { ok: false, error: "인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  return { ok: true };
}

export async function verifyPhoneCode(input: {
  phone: string;
  code: string;
  purpose: PhoneVerificationPurpose;
}): Promise<{ ok: true; verificationId: string } | { ok: false; error: string }> {
  const phone = normalizePhone(input.phone);
  if (!phone) return { ok: false, error: "올바른 휴대전화번호를 입력해주세요." };

  const repo = getPhoneVerificationRepository();
  const record = await repo.findLatestActive(phone, input.purpose);
  if (!record) {
    return { ok: false, error: "인증번호가 만료되었습니다. 다시 요청해주세요." };
  }

  const attempts = await repo.incrementAttempt(record.id);
  if (attempts > MAX_ATTEMPTS) {
    await repo.expire(record.id);
    return { ok: false, error: "인증 시도 횟수를 초과했습니다. 다시 요청해주세요." };
  }

  if (record.codeHash !== hashCode(input.code, phone)) {
    return { ok: false, error: "인증번호가 올바르지 않습니다." };
  }

  await repo.markVerified(record.id);
  return { ok: true, verificationId: record.id };
}

/**
 * 아이디찾기·비밀번호변경이 "휴대폰 인증을 실제로 통과했는지"를 서버에서 확인하고 1회용으로 소비한다.
 * verified/미소비/미만료/purpose·phone 일치를 모두 만족해야 true.
 */
export async function consumePhoneVerification(input: {
  verificationId: string;
  phone: string;
  purpose: PhoneVerificationPurpose;
}): Promise<boolean> {
  const phone = normalizePhone(input.phone);
  if (!phone) return false;

  const repo = getPhoneVerificationRepository();
  const record = await repo.findById(input.verificationId);
  if (!record) return false;
  if (record.phone !== phone) return false;
  if (record.purpose !== input.purpose) return false;
  if (!record.verifiedAt) return false;
  if (record.consumedAt) return false;
  if (new Date(record.expiresAt).getTime() < Date.now()) return false;

  await repo.markConsumed(record.id);
  return true;
}
