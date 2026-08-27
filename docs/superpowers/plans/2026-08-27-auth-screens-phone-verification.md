# 인증 화면 4종 + 휴대폰 인증 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 디자이너 핸드오프 인증 화면 4종(로그인·회원가입·아이디찾기·비밀번호찾기)을 실제 인증에 연결하고, 휴대폰 SMS 인증(NCP SENS) 전체를 구현한다.

**Architecture:** SMS 발송은 교체 가능한 Provider(NCP SENS / 개발용 콘솔), 인증번호는 신규 `phone_verifications` 테이블에 해시로 저장. 검증 성공 시 발급되는 `verificationId`를 아이디찾기·비밀번호변경 액션이 서버에서 필수 검증한다. UI는 핸드오프 디자인을 그대로 이식하고 기존 서버 액션(signUp/signIn)에 연결한다.

**Tech Stack:** Next.js 16 App Router, Server Actions, Supabase(+admin), 기존 repository 레이어, tsx 검증 스크립트.

**설계 문서:** `docs/superpowers/specs/2026-08-27-auth-screens-phone-verification-design.md`
**핸드오프 원본:** `/Users/korhrd/Downloads/handoff/auth/` (ui.tsx, LoginPage.tsx, SignupPage.tsx, FindIdPage.tsx, FindPasswordPage.tsx)

## Global Constraints

- **fail-closed**: 운영(`NODE_ENV === "production"`)에서 NCP SENS 키가 없으면 콘솔 provider로 폴백하지 않고 발송 액션이 에러를 반환한다. 키 없이 인증이 통과되는 경로를 만들지 않는다.
- 인증번호 평문 저장 금지 — `sha256(code + phone)` 해시만 저장.
- 아이디찾기·비밀번호변경은 반드시 `verificationId`를 서버에서 검증(verified·미소비·미만료·purpose 일치·phone 일치)한 뒤 즉시 소비 처리.
- DB 접근은 `@/lib/repositories` getter 경유, mock/supabase 이중 모드 동작.
- 기존 동작 유지: `next` 파라미터, 익명 데이터 병합, 회원가입 후 온보딩 리다이렉트, 소셜 OAuth 라우트, `/forgot-password`·`/reset-password` 이메일 링크 경로.
- UI 문구 한국어. 커밋 메시지 한국어 한 줄. **git add는 각 태스크에 명시된 파일만** (워킹트리에 무관한 변경 있음 — `git add -A` 금지).

---

### Task 1: SMS Provider + 인증번호 저장소 + 서비스 + 검증 스크립트

**Files:**
- Create: `src/types/phone-verification.ts`
- Create: `src/lib/sms/types.ts`, `src/lib/sms/ncp-sens.provider.ts`, `src/lib/sms/console.provider.ts`, `src/lib/sms/index.ts`
- Create: `supabase/migrations/0046_phone_verifications.sql`
- Create: `src/lib/repositories/phone-verification-repository.ts`, `src/lib/repositories/supabase/phone-verification.supabase-repository.ts`
- Modify: `src/lib/repositories/index.ts` (getter export 추가 — 기존 export 패턴 확인 후 동일하게)
- Create: `src/services/phone-verification.service.ts`
- Test: `scripts/check-phone-verification.ts`

**Interfaces:**
- Consumes: `normalizePhone`/`isValidKoreanPhone` (`@/lib/utils/phone`), `resolveRepository` (`@/lib/data/resolve-repository`), `createAdminSupabaseClient` (`@/lib/supabase/admin`), `unwrapList`/`unwrapMaybe`/`throwDataSourceError` (`@/lib/repositories/supabase/query-helpers`)
- Produces (Task 2가 사용):
  - `sendPhoneVerificationCode(input: { phone: string; purpose: PhoneVerificationPurpose }): Promise<{ ok: true } | { ok: false; error: string }>`
  - `verifyPhoneCode(input: { phone: string; code: string; purpose: PhoneVerificationPurpose }): Promise<{ ok: true; verificationId: string } | { ok: false; error: string }>`
  - `consumePhoneVerification(input: { verificationId: string; phone: string; purpose: PhoneVerificationPurpose }): Promise<boolean>`
  - 타입 `PhoneVerificationPurpose = "signup" | "find_id" | "find_password"`

- [ ] **Step 1: 검증 스크립트 먼저 작성 (실패 확인용)**

`scripts/check-phone-verification.ts`:

```typescript
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
```

- [ ] **Step 2: 실행해 실패 확인**

Run: `DATA_SOURCE_MODE=mock npx tsx scripts/check-phone-verification.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 타입 정의**

`src/types/phone-verification.ts`:

```typescript
export type PhoneVerificationPurpose = "signup" | "find_id" | "find_password";

/** 휴대폰 인증번호 발급 1건. code는 절대 저장하지 않고 codeHash만 보관한다. */
export interface PhoneVerification {
  id: string;
  phone: string;
  purpose: PhoneVerificationPurpose;
  codeHash: string;
  expiresAt: string;
  attemptCount: number;
  verifiedAt?: string;
  consumedAt?: string;
  createdAt: string;
}

export interface PhoneVerificationCreateInput {
  phone: string;
  purpose: PhoneVerificationPurpose;
  codeHash: string;
  expiresAt: string;
}
```

`src/types/index.ts`에 `export * from "./phone-verification";` 추가 (기존 파일의 export 패턴 그대로).

- [ ] **Step 4: 마이그레이션**

`supabase/migrations/0046_phone_verifications.sql`:

```sql
-- 0046_phone_verifications.sql
-- 휴대폰 인증번호 발급/검증 기록. 코드는 평문 저장하지 않고 해시만 보관한다.
-- 서버(service role)만 접근한다 - RLS를 켜고 정책을 두지 않아 클라이언트 접근을 전면 차단한다.

create table if not exists public.phone_verifications (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  purpose text not null check (purpose in ('signup', 'find_id', 'find_password')),
  code_hash text not null,
  expires_at timestamptz not null,
  attempt_count integer not null default 0,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_phone_verifications_lookup
  on public.phone_verifications (phone, purpose, created_at desc);

alter table public.phone_verifications enable row level security;
```

- [ ] **Step 5: SMS Provider 계층**

`src/lib/sms/types.ts`:

```typescript
export interface SmsProvider {
  getProviderName(): string;
  sendVerificationCode(phone: string, code: string): Promise<void>;
}
```

`src/lib/sms/ncp-sens.provider.ts`:

```typescript
import { createHmac } from "node:crypto";
import type { SmsProvider } from "./types";

const SENS_HOST = "https://sens.apigw.ntruss.com";

export interface NcpSensConfig {
  serviceId: string;
  accessKey: string;
  secretKey: string;
  senderPhone: string;
}

/**
 * 네이버 클라우드 플랫폼 SENS SMS v2 발송 Provider.
 * 서명 규격: HMAC-SHA256("POST {uri}\n{timestamp}\n{accessKey}", secretKey) → base64
 */
export class NcpSensSmsProvider implements SmsProvider {
  constructor(private readonly config: NcpSensConfig) {}

  getProviderName(): string {
    return "ncp-sens";
  }

  async sendVerificationCode(phone: string, code: string): Promise<void> {
    const uri = `/sms/v2/services/${this.config.serviceId}/messages`;
    const timestamp = String(Date.now());
    const signature = createHmac("sha256", this.config.secretKey)
      .update(`POST ${uri}\n${timestamp}\n${this.config.accessKey}`)
      .digest("base64");

    const content = `[한평생 바로취업] 인증번호 ${code} 를 입력해주세요. (3분 이내)`;

    const response = await fetch(`${SENS_HOST}${uri}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-ncp-apigw-timestamp": timestamp,
        "x-ncp-iam-access-key": this.config.accessKey,
        "x-ncp-apigw-signature-v2": signature,
      },
      body: JSON.stringify({
        type: "SMS",
        contentType: "COMM",
        countryCode: "82",
        from: this.config.senderPhone,
        content,
        messages: [{ to: phone }],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`SENS 발송 실패 (${response.status}): ${body.slice(0, 200)}`);
    }
  }
}
```

`src/lib/sms/console.provider.ts`:

```typescript
import type { SmsProvider } from "./types";

/** NCP SENS 키가 없을 때 쓰는 개발 전용 Provider. 실제로 발송하지 않고 서버 콘솔에만 출력한다. */
export class ConsoleSmsProvider implements SmsProvider {
  getProviderName(): string {
    return "console";
  }

  async sendVerificationCode(phone: string, code: string): Promise<void> {
    console.log(`[SMS:console] ${phone} 인증번호 ${code}`);
  }
}
```

`src/lib/sms/index.ts`:

```typescript
import { ConsoleSmsProvider } from "./console.provider";
import { NcpSensSmsProvider } from "./ncp-sens.provider";
import type { SmsProvider } from "./types";

export type { SmsProvider } from "./types";

function readSensConfig() {
  const serviceId = process.env.NCP_SENS_SERVICE_ID?.trim();
  const accessKey = process.env.NCP_SENS_ACCESS_KEY?.trim();
  const secretKey = process.env.NCP_SENS_SECRET_KEY?.trim();
  const senderPhone = process.env.NCP_SENS_SENDER_PHONE?.trim();
  if (!serviceId || !accessKey || !secretKey || !senderPhone) return null;
  return { serviceId, accessKey, secretKey, senderPhone };
}

/** SENS 키가 모두 있으면 실제 발송, 아니면 개발용 콘솔 Provider. 운영에서 키가 없으면 null. */
export function getSmsProvider(): SmsProvider | null {
  const config = readSensConfig();
  if (config) return new NcpSensSmsProvider(config);
  // fail-closed: 운영에서 키가 없으면 인증을 통과시키지 않는다 (설계 2절).
  if (process.env.NODE_ENV === "production") return null;
  return new ConsoleSmsProvider();
}
```

- [ ] **Step 6: Repository (mock + supabase)**

`src/lib/repositories/phone-verification-repository.ts` — 기존 repository 파일(예: `occupation-repository.ts`)의 구조·주석 톤을 열어 확인하고 동일하게 작성한다. 인터페이스:

```typescript
export interface PhoneVerificationRepository {
  create(input: PhoneVerificationCreateInput): Promise<PhoneVerification>;
  findById(id: string): Promise<PhoneVerification | null>;
  /** 아직 만료되지 않고 소비되지 않은 가장 최근 발급 1건 */
  findLatestActive(phone: string, purpose: PhoneVerificationPurpose): Promise<PhoneVerification | null>;
  /** since 이후 발송 건수 (발송 횟수 제한용) */
  countSendsSince(phone: string, since: string): Promise<number>;
  incrementAttempt(id: string): Promise<number>;
  markVerified(id: string): Promise<void>;
  markConsumed(id: string): Promise<void>;
  /** 시도 초과 등으로 즉시 폐기 (expires_at을 과거로) */
  expire(id: string): Promise<void>;
}
```

mock 구현은 모듈 스코프 배열, supabase 구현은 `createAdminSupabaseClient()` 사용(service role 전용 테이블이므로 admin 클라이언트). `resolveRepository("PhoneVerificationRepository", { mock, supabase })` 패턴으로 `getPhoneVerificationRepository()` export하고, `src/lib/repositories/index.ts`에 re-export를 추가한다.

- [ ] **Step 7: 서비스 구현**

`src/services/phone-verification.service.ts`:

```typescript
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
```

주의: `incrementAttempt`는 증가 **후** 값을 반환해야 하며(위 로직이 `> MAX_ATTEMPTS` 비교), 5회 실패 후 정상 코드도 거부되어야 한다(검증 스크립트 4번). mock/supabase 양쪽 구현이 같은 의미를 갖도록 맞출 것.

- [ ] **Step 8: 스크립트 통과 확인**

Run: `DATA_SOURCE_MODE=mock npx tsx scripts/check-phone-verification.ts`
Expected: `모든 검증 통과`. `npx tsc --noEmit`도 통과.

- [ ] **Step 9: 커밋**

```bash
git add src/types/phone-verification.ts src/types/index.ts src/lib/sms src/lib/repositories/phone-verification-repository.ts src/lib/repositories/supabase/phone-verification.supabase-repository.ts src/lib/repositories/index.ts src/services/phone-verification.service.ts supabase/migrations/0046_phone_verifications.sql scripts/check-phone-verification.ts
git commit -m "휴대폰 인증 기반 구축 - NCP SENS Provider + 인증번호 저장소·서비스"
```

---

### Task 2: 인증/계정찾기 서버 액션

**Files:**
- Create: `src/features/auth/phone-verification-actions.ts`
- Create: `src/features/auth/find-account-actions.ts`

**Interfaces:**
- Consumes: Task 1의 `sendPhoneVerificationCode`/`verifyPhoneCode`/`consumePhoneVerification`, `createAdminSupabaseClient`(`@/lib/supabase/admin`), `normalizePhone`(`@/lib/utils/phone`), `logActivityEvent`(`@/lib/activity/event-logger`)
- Produces (Task 3이 사용):
  - `sendPhoneCodeAction(input: { phone: string; purpose: PhoneVerificationPurpose }): Promise<{ ok: boolean; error?: string }>`
  - `verifyPhoneCodeAction(input: { phone: string; code: string; purpose: PhoneVerificationPurpose }): Promise<{ ok: boolean; verificationId?: string; error?: string }>`
  - `findIdAction(input: { name: string; phone: string; verificationId: string }): Promise<{ ok: boolean; maskedEmail?: string; joinedAt?: string; error?: string }>`
  - `resetPasswordWithPhoneAction(input: { email: string; phone: string; verificationId: string; password: string; passwordConfirm: string }): Promise<{ ok: boolean; error?: string }>`
  - `checkEmailAvailableAction(email: string): Promise<{ available: boolean; error?: string }>`

- [ ] **Step 1: phone-verification-actions.ts**

```typescript
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
```

- [ ] **Step 2: find-account-actions.ts**

```typescript
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
```

주의: `logActivityEvent`의 eventType 유니온이 닫혀 있으면 `find_id_completed`·`password_reset_completed`를 추가한다(열린 타입이면 그대로 통과).

- [ ] **Step 3: 타입체크 후 커밋**

Run: `npx tsc --noEmit && npx eslint src/features/auth/phone-verification-actions.ts src/features/auth/find-account-actions.ts`
```bash
git add src/features/auth/phone-verification-actions.ts src/features/auth/find-account-actions.ts src/types/activity-event.ts
git commit -m "휴대폰 인증·아이디찾기·비밀번호 재설정 서버 액션 추가"
```

---

### Task 3: 핸드오프 UI 이식 + 화면 4종

**Files:**
- Create: `src/features/auth/handoff-ui.tsx`
- Create: `src/features/auth/login-view.tsx`, `src/features/auth/signup-view.tsx`, `src/features/auth/find-id-view.tsx`, `src/features/auth/find-password-view.tsx`

**Interfaces:**
- Consumes: Task 2의 액션 5종, 기존 `signUpAction`/`signInAction`(`./auth-actions`, `useActionState` 패턴 — 기존 `login-form.tsx`/`signup-form.tsx`를 열어 확인), `validateSignup`(`./signup-validation`)
- Produces: `<LoginView next={string} />`, `<SignupView next={string} />`, `<FindIdView />`, `<FindPasswordView />` — Task 4가 사용

- [ ] **Step 1: 공통 UI 이식**

`/Users/korhrd/Downloads/handoff/auth/ui.tsx`를 `src/features/auth/handoff-ui.tsx`로 복사하고 다음만 수정한다:
- 파일 상단에 출처 주석: `/** 디자이너 핸드오프(handoff/auth/ui.tsx) 이식. 인증 화면 전용 웜 톤 컴포넌트. */`
- `BottomLinks`의 `<a href>` → `next/link`의 `<Link href>` (Next 라우팅 + 린트 규칙)
- `SocialButtons`를 삭제하고, 대신 기존 소셜 OAuth 라우트로 이동하는 링크 버튼으로 재작성:
  ```tsx
  export function SocialButtons({ next }: { next?: string }) {
    const q = next ? `?next=${encodeURIComponent(next)}` : "";
    return (
      <div className="mt-3 flex flex-col gap-2.5">
        <a href={`/auth/login/kakao${q}`} className="flex h-14 w-full items-center justify-center gap-[9px] rounded-[14px] bg-[#fee500] text-[15px] font-bold text-[#191600] transition hover:brightness-95">
          <span className="h-5 w-5 rounded-full bg-[#191600]" aria-hidden />
          카카오 로그인
        </a>
        <a href={`/auth/login/naver${q}`} className="flex h-14 w-full items-center justify-center gap-[9px] rounded-[14px] bg-[#03c75a] text-[15px] font-bold text-white transition hover:brightness-95">
          <span className="h-5 w-5 rounded-full bg-white" aria-hidden />
          네이버로 로그인
        </a>
      </div>
    );
  }
  ```
  (OAuth 시작은 서버 라우트 이동이라 `<a>`가 맞다. `no-html-link-for-pages` 린트가 걸리면 해당 줄에 이유를 적은 eslint-disable 주석을 단다.)
- 나머지(AuthShell/BrandMark/PageTitle/Label/Input/InputWithAction/HelpText/PrimaryButton/Checkbox/Divider)는 그대로.

- [ ] **Step 2: 재사용할 인증번호 입력 컴포넌트**

`handoff-ui.tsx`에 3개 화면이 공유할 인증 블록을 추가한다 (핸드오프의 FindIdPage/FindPasswordPage/SignupPage에 흩어진 코드를 하나로):

```tsx
"use client";
// (파일 상단에 이미 "use client"가 있으므로 중복 선언하지 말 것)

import { sendPhoneCodeAction, verifyPhoneCodeAction } from "./phone-verification-actions";
import type { PhoneVerificationPurpose } from "@/types";

/**
 * 휴대전화 입력 + 인증번호 발송/검증 블록.
 * 검증 성공 시 상위로 verificationId를 올려주고, 번호가 바뀌면 인증 상태를 초기화한다.
 */
export function PhoneVerificationField({
  purpose,
  phone,
  onPhoneChange,
  onVerified,
  idPrefix,
}: {
  purpose: PhoneVerificationPurpose;
  phone: string;
  onPhoneChange: (v: string) => void;
  onVerified: (verificationId: string | null) => void;
  idPrefix: string;
}) {
  const [code, setCode] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [left, setLeft] = React.useState(0);
  const [verified, setVerified] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!sent || left <= 0) return;
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [sent, left]);

  const mmss = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;

  async function handleSend() {
    setBusy(true);
    setError(null);
    const result = await sendPhoneCodeAction({ phone, purpose });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "인증번호 발송에 실패했습니다.");
      return;
    }
    setSent(true);
    setLeft(180);
    setVerified(false);
    onVerified(null);
  }

  async function handleVerify() {
    setBusy(true);
    setError(null);
    const result = await verifyPhoneCodeAction({ phone, code, purpose });
    setBusy(false);
    if (!result.ok || !result.verificationId) {
      setError(result.error ?? "인증번호가 올바르지 않습니다.");
      return;
    }
    setVerified(true);
    onVerified(result.verificationId);
  }

  return (
    <>
      <div>
        <Label htmlFor={`${idPrefix}-phone`}>휴대전화번호</Label>
        <InputWithAction
          action={sent ? "재전송" : "인증"}
          onAction={handleSend}
          inputProps={{
            id: `${idPrefix}-phone`,
            type: "tel",
            inputMode: "tel",
            autoComplete: "tel",
            placeholder: "010-0000-0000",
            value: phone,
            disabled: busy || verified,
            onChange: (e) => {
              onPhoneChange(e.target.value);
              setVerified(false);
              setSent(false);
              onVerified(null);
            },
          }}
        />
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-code`}>인증번호</Label>
        <div className="flex gap-2">
          <Input
            id={`${idPrefix}-code`}
            inputMode="numeric"
            maxLength={6}
            placeholder="6자리 입력"
            value={code}
            disabled={!sent || verified}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <button
            type="button"
            onClick={handleVerify}
            disabled={!sent || verified || code.length !== 6 || busy}
            className={[
              "h-14 w-[78px] flex-none rounded-[14px] text-[14px] font-bold transition-colors disabled:opacity-50",
              verified
                ? "bg-[#eaf3ec] text-[#0f9d58]"
                : "border-[1.5px] border-[#1c1a17] bg-white text-[#1c1a17] hover:bg-[#1c1a17] hover:text-white",
            ].join(" ")}
          >
            {verified ? "완료" : "확인"}
          </button>
        </div>
        {verified ? <HelpText tone="ok">인증이 완료되었습니다</HelpText> : null}
        {!verified && sent ? <HelpText>남은 시간 {mmss}</HelpText> : null}
        {error ? <HelpText tone="error">{error}</HelpText> : null}
      </div>
    </>
  );
}
```

- [ ] **Step 3: 화면 4종 작성**

핸드오프의 4개 파일을 각각 이식하되 목데이터·빈 onSubmit을 실제 액션으로 교체한다:

- **`login-view.tsx`** (`LoginPage.tsx` 기반): 기존 `signInAction`을 `useActionState`로 연결(`login-form.tsx`의 사용법 그대로 복사). form에 `<input type="hidden" name="next" value={next} />` 포함. 에러는 `HelpText tone="error"`로 표시. `SocialButtons next={next}`, BottomLinks는 `/find-id`·`/find-password`·`/signup?next=...`.
- **`signup-view.tsx`** (`SignupPage.tsx` 기반): 기존 `signUpAction`을 `useActionState`로 연결. 이메일 필드의 "중복확인" 버튼 → `checkEmailAvailableAction`(결과를 HelpText로). 휴대전화는 Step 2의 `PhoneVerificationField purpose="signup"`로 교체하고, 검증된 verificationId를 hidden input(`name="phoneVerificationId"`)으로 함께 전송. 제출 버튼 활성 조건에 기존 `validateSignup` 규칙 + 휴대폰 인증 완료를 포함. hidden `next`도 포함.
- **`find-id-view.tsx`** (`FindIdPage.tsx` 기반): 이름 + `PhoneVerificationField purpose="find_id"` → `findIdAction`. 결과 카드에 서버가 준 `maskedEmail`/`joinedAt` 표시(목데이터 제거). 실패 시 에러 문구.
- **`find-password-view.tsx`** (`FindPasswordPage.tsx` 기반): 이메일 + `PhoneVerificationField purpose="find_password"` → 인증 완료 후 새 비밀번호 입력 활성 → `resetPasswordWithPhoneAction`. 성공 시 "비밀번호가 변경되었습니다" 안내 + 로그인 링크. BottomLinks에 `/login`·`/find-id` + "이메일로 재설정"(`/forgot-password`) 추가.

- [ ] **Step 4: 타입체크·린트 후 커밋**

Run: `npx tsc --noEmit && npx eslint src/features/auth/handoff-ui.tsx src/features/auth/login-view.tsx src/features/auth/signup-view.tsx src/features/auth/find-id-view.tsx src/features/auth/find-password-view.tsx`
```bash
git add src/features/auth/handoff-ui.tsx src/features/auth/login-view.tsx src/features/auth/signup-view.tsx src/features/auth/find-id-view.tsx src/features/auth/find-password-view.tsx
git commit -m "인증 화면 4종 핸드오프 디자인 이식 + 실제 액션 연결"
```

---

### Task 4: 라우트 연결 + 회원가입 액션의 인증 검증 + 전체 검증

**Files:**
- Modify: `src/app/(site)/login/page.tsx`, `src/app/(site)/signup/page.tsx`
- Create: `src/app/(site)/find-id/page.tsx`, `src/app/(site)/find-password/page.tsx`
- Modify: `src/features/auth/auth-actions.ts` (signUpAction에 휴대폰 인증 확인 추가)

**Interfaces:**
- Consumes: Task 3의 뷰 4종, 기존 `sanitizeNextPath`/`getCurrentUser`, Task 1의 `consumePhoneVerification`

- [ ] **Step 1: 로그인·회원가입 페이지 교체**

`login/page.tsx`: 기존 `AuthCard`+`LoginForm`+`SocialLoginButtons` 렌더를 `<LoginView next={next} />` 하나로 교체한다. `metadata`, `getCurrentUser()` 후 리다이렉트, `sanitizeNextPath`는 그대로 유지. `signup/page.tsx`도 동일하게 `<SignupView next={next} />`로 교체하고 기존 유지 로직은 보존한다. (핸드오프 화면이 자체 카드/타이틀을 그리므로 AuthCard로 감싸지 않는다.)

- [ ] **Step 2: 신규 페이지 2종**

```tsx
// src/app/(site)/find-id/page.tsx
import type { Metadata } from "next";
import { FindIdView } from "@/features/auth/find-id-view";

export const metadata: Metadata = { title: "아이디 찾기 | 한평생 바로취업" };

export default function FindIdPage() {
  return <FindIdView />;
}
```

```tsx
// src/app/(site)/find-password/page.tsx
import type { Metadata } from "next";
import { FindPasswordView } from "@/features/auth/find-password-view";

export const metadata: Metadata = { title: "비밀번호 찾기 | 한평생 바로취업" };

export default function FindPasswordPage() {
  return <FindPasswordView />;
}
```

- [ ] **Step 3: signUpAction에 휴대폰 인증 확인 추가**

`auth-actions.ts`의 `signUpAction`에서 `validateSignup` 통과 직후, 실제 계정 생성 전에:

```typescript
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
```

`getSmsProvider`는 `@/lib/sms`에서 import한다. `phone` 변수(`normalizePhone` 결과)는 이 코드 아래에서 정의되므로 위치를 확인해 `phoneRaw`를 쓰거나 순서를 맞춘다.

- [ ] **Step 4: 브라우저 검증**

`preview_start`로 dev 서버 기동 → `/login`, `/signup`, `/find-id`, `/find-password` 4개 화면 렌더 확인, 콘솔 에러 없음(`read_console_messages`), 각 화면 스크린샷 1장. mock 모드에서 인증번호는 서버 콘솔(`preview_logs`)에 `[SMS:console]`로 출력되므로 그 값으로 아이디찾기 흐름까지 1회 통과시켜 본다.

- [ ] **Step 5: 전체 검증 후 커밋**

Run: `DATA_SOURCE_MODE=mock npx tsx scripts/check-phone-verification.ts && npm run lint && npm run build`
(기존에 존재하던 무관한 lint 에러 11건은 이번 범위 밖 — 새로 늘지 않았는지만 확인)

```bash
git add "src/app/(site)/login/page.tsx" "src/app/(site)/signup/page.tsx" "src/app/(site)/find-id" "src/app/(site)/find-password" src/features/auth/auth-actions.ts
git commit -m "인증 화면 라우트 연결 + 회원가입 휴대폰 인증 서버 검증"
```

---

### Task 5: 마이그레이션 적용 및 환경변수 문서화

**Files:**
- Modify: `.env.example` (있으면; 없으면 생성)

- [ ] **Step 1: 환경변수 문서화**

`.env.example`에 다음을 주석과 함께 추가(파일이 없으면 생성):

```
# 네이버 클라우드 SENS (휴대폰 인증 SMS 발송). 4개를 모두 채우면 실제 발송, 비우면 개발용 콘솔 출력.
# 운영(NODE_ENV=production)에서 비어 있으면 휴대폰 인증 기능이 비활성화된다.
NCP_SENS_SERVICE_ID=
NCP_SENS_ACCESS_KEY=
NCP_SENS_SECRET_KEY=
NCP_SENS_SENDER_PHONE=
```

- [ ] **Step 2: 마이그레이션 적용 안내**

원격 DB에 `0046_phone_verifications.sql`을 적용해야 실제 인증이 동작한다: `npm run migrate:remote`.
이 스텝은 실행하지 말고(운영 DB 변경), 최종 보고에 "적용 필요"로 남긴다.

- [ ] **Step 3: 커밋**

```bash
git add .env.example
git commit -m "NCP SENS 환경변수 예시 추가"
```
