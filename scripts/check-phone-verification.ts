/**
 * phone-verification.service 검증 스크립트 (mock 모드).
 * 실행: DATA_SOURCE_MODE=mock npx tsx scripts/check-phone-verification.ts
 */
import {
  consumePhoneVerification,
  sendPhoneVerificationCode,
  verifyPhoneCode,
  __testOnlyPeekCode,
} from "@/services/phone-verification.service";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

async function main() {
  if (process.env.DATA_SOURCE_MODE !== "mock") {
    console.error("DATA_SOURCE_MODE=mock 으로 실행하세요.");
    process.exit(1);
  }
  const phone = "01012345678";

  // 1. 발송 → 검증 성공 → verificationId
  const sent = await sendPhoneVerificationCode({ phone, purpose: "find_id" });
  assert(sent.ok, "인증번호 발송 성공");
  const code = __testOnlyPeekCode(phone, "find_id");
  assert(code && code.length === 6, `발급 코드 6자리 (got ${code})`);

  const wrong = await verifyPhoneCode({ phone, code: "000000", purpose: "find_id" });
  assert(!wrong.ok, "잘못된 코드 거부");

  const verified = await verifyPhoneCode({ phone, code: code!, purpose: "find_id" });
  assert(verified.ok && verified.verificationId, "올바른 코드 검증 성공 + verificationId 발급");
  const verificationId = (verified as { verificationId: string }).verificationId;

  // 2. purpose 불일치 거부
  assert(
    !(await consumePhoneVerification({ verificationId, phone, purpose: "find_password" })),
    "purpose 불일치 소비 거부",
  );

  // 3. 정상 소비 → 재사용 거부
  assert(await consumePhoneVerification({ verificationId, phone, purpose: "find_id" }), "정상 소비 성공");
  assert(
    !(await consumePhoneVerification({ verificationId, phone, purpose: "find_id" })),
    "소비된 verificationId 재사용 거부",
  );

  // 4. 검증 시도 5회 초과 시 폐기
  const phone2 = "01099998888";
  await sendPhoneVerificationCode({ phone: phone2, purpose: "signup" });
  const realCode = __testOnlyPeekCode(phone2, "signup")!;
  for (let i = 0; i < 5; i++) {
    await verifyPhoneCode({ phone: phone2, code: "111111", purpose: "signup" });
  }
  const afterLockout = await verifyPhoneCode({ phone: phone2, code: realCode, purpose: "signup" });
  assert(!afterLockout.ok, "5회 실패 후에는 정상 코드도 거부(폐기)");

  // 5. 발송 횟수 제한 (시간당 5회)
  const phone3 = "01077776666";
  for (let i = 0; i < 5; i++) {
    await sendPhoneVerificationCode({ phone: phone3, purpose: "signup" });
  }
  const over = await sendPhoneVerificationCode({ phone: phone3, purpose: "signup" });
  assert(!over.ok, "시간당 발송 5회 초과 거부");

  // 6. 잘못된 번호 형식 거부
  const badPhone = await sendPhoneVerificationCode({ phone: "123", purpose: "signup" });
  assert(!badPhone.ok, "잘못된 휴대전화번호 거부");

  console.log("\n모든 검증 통과");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
