# 인증 화면 4종 + 휴대폰 인증 설계 (Auth Handoff)

- 작성일: 2026-08-27
- 상태: 사용자 승인된 설계
- 관련: 디자이너 핸드오프 `~/Downloads/handoff/auth/` (LoginPage/SignupPage/FindIdPage/FindPasswordPage/ui.tsx)

## 1. 배경과 목표

디자이너 핸드오프로 받은 인증 화면 4종(로그인·회원가입·아이디찾기·비밀번호찾기)을 실제 인증에 연결한다.
기존에 로그인·회원가입·비밀번호 재설정(이메일 링크)·소셜 로그인은 Supabase 실인증으로 이미 동작하지만,
핸드오프가 전제하는 **휴대폰 SMS 인증**과 **아이디 찾기**가 없다.

방침(사용자 승인): SMS 발송까지 포함해 **전부 구현**하고, 네이버 클라우드(NCP SENS) 키는 나중에 환경변수로 연결한다.

## 2. SMS 발송 계층 (Provider 패턴)

채용공고 Provider(`src/features/jobs/providers`)와 동일한 교체 가능 구조.

- `src/lib/sms/types.ts` — `SmsProvider { sendVerificationCode(phone, code): Promise<void>; getProviderName(): string }`
- `src/lib/sms/ncp-sens.provider.ts` — 네이버 클라우드 SENS SMS v2
  - `POST https://sens.apigw.ntruss.com/sms/v2/services/{serviceId}/messages`
  - 헤더: `Content-Type: application/json; charset=utf-8`, `x-ncp-apigw-timestamp`, `x-ncp-iam-access-key`, `x-ncp-apigw-signature-v2`
  - 서명: `HMAC-SHA256("POST /sms/v2/services/{serviceId}/messages\n{timestamp}\n{accessKey}", secretKey)` → base64
  - 본문: `{ type: "SMS", contentType: "COMM", countryCode: "82", from, content, messages: [{ to }] }`
- `src/lib/sms/console.provider.ts` — 키 미설정 시 개발용. 서버 콘솔에 코드 출력.
- `src/lib/sms/index.ts` — `getSmsProvider()`: 4개 키(`NCP_SENS_SERVICE_ID`/`NCP_SENS_ACCESS_KEY`/`NCP_SENS_SECRET_KEY`/`NCP_SENS_SENDER_PHONE`)가 모두 있으면 NCP, 아니면 console.

**보안 원칙(fail-closed)**: 운영 환경(`NODE_ENV === "production"`)에서 SENS 키가 없으면 console provider를 쓰지 않고
발송 액션이 에러를 반환한다. 키 없이 인증이 통과되는 경로를 원천 차단한다.

## 3. 인증번호 저장 (신규 테이블)

마이그레이션 `supabase/migrations/0046_phone_verifications.sql`:

```
phone_verifications
  id uuid pk default gen_random_uuid()
  phone text not null                  -- 숫자만 (normalizePhone)
  purpose text not null                -- 'signup' | 'find_id' | 'find_password'
  code_hash text not null              -- sha256(code + phone), 평문 저장 금지
  expires_at timestamptz not null      -- 발급 + 3분
  attempt_count int not null default 0 -- 검증 시도 횟수
  verified_at timestamptz              -- 검증 성공 시각
  consumed_at timestamptz              -- 후속 액션에서 1회 사용 후 소비
  created_at timestamptz not null default now()
  index (phone, purpose, created_at desc)
```

- RLS: 활성화하되 정책 없음 = 클라이언트 접근 전면 차단. 서버(service role)만 접근.
- 코드는 6자리 숫자, 3분 만료(디자인의 180초 타이머와 일치).
- 검증 5회 실패 시 해당 행 폐기(만료 처리).
- 발송 제한: 같은 번호 기준 1시간 내 5회.
- Mock Mode(Supabase 미설정)에서는 동일 규칙을 메모리 Map으로 구현한다.

## 4. 서버 액션

`src/features/auth/phone-verification-actions.ts`:
- `sendPhoneCodeAction({ phone, purpose })` → `{ ok } | { error }`
- `verifyPhoneCodeAction({ phone, code, purpose })` → `{ ok, verificationId } | { error }`

`src/features/auth/find-account-actions.ts`:
- `findIdAction({ name, phone, verificationId })` → `{ maskedEmail, joinedAt } | { error }`
  - profiles에서 이름+전화 일치 회원 조회, 이메일 마스킹은 **서버에서** 수행(앞 4자 노출: `hong****@naver.com`).
- `resetPasswordWithPhoneAction({ email, phone, verificationId, password, passwordConfirm })` → `{ ok } | { error }`
  - profiles에서 email+phone이 **같은 회원**인지 확인 후 admin API(`auth.admin.updateUserById`)로 비밀번호 변경.
- `checkEmailAvailableAction(email)` → `{ available } | { error }` (회원가입 중복확인 버튼)

**verificationId 규칙(핵심 보안)**: 아이디찾기·비밀번호변경은 verificationId를 필수로 받고,
서버에서 (a) 해당 행이 verified 상태, (b) 미소비, (c) 만료 전, (d) purpose 일치, (e) phone 일치를 모두 확인한 뒤에만 수행하고
즉시 `consumed_at`을 찍는다. 클라이언트가 인증 단계를 건너뛸 수 없다.

## 5. 화면 4종

핸드오프의 `ui.tsx` 공통 컴포넌트를 `src/features/auth/handoff-ui.tsx`로 이식하고, 화면 4종을 각각
`login-page-view.tsx` / `signup-page-view.tsx` / `find-id-page-view.tsx` / `find-password-page-view.tsx`로 만든다.
라우트: `/login`, `/signup`, `/find-id`(신규), `/find-password`(신규).

유지해야 할 기존 동작:
- `next` 파라미터(로그인 후 원래 목적지 복귀), 이미 로그인 시 리다이렉트
- 회원가입 → 온보딩(`/onboarding/profile?next=...`) 흐름, 익명 데이터 병합
- 소셜 로그인(네이버·카카오) 실제 OAuth 라우트(`/auth/login/[provider]`) 연결 — 디자인 스타일 유지
- 기존 `/forgot-password`(이메일 링크) + `/reset-password` 경로 유지. `/find-password` 하단에 "이메일로 재설정" 링크 추가.

디자인 톤은 핸드오프 그대로(웜 톤) 인증 화면에만 적용한다.

## 6. 에러 처리

- SMS 발송 실패: "인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요." (실패 원인 상세는 서버 로그만)
- 아이디 찾기 미일치: "일치하는 회원 정보를 찾을 수 없습니다." (가입 여부 노출 최소화)
- 발송 횟수 초과 / 검증 시도 초과: 각각 명시적 안내 문구
- 운영에서 SENS 키 없음: "휴대폰 인증 서비스가 준비 중입니다."

## 7. 테스트

`scripts/check-phone-verification.ts` (mock 모드):
- 발송 → 검증 성공 → verificationId 발급
- 잘못된 코드 5회 → 폐기
- 만료된 코드 거부
- verificationId 재사용(소비 후) 거부
- purpose 불일치 거부
- 아이디 찾기: 일치 회원 마스킹 결과 / 미일치 시 에러

## 8. 범위 외

- NCP SENS 실계정 발급 및 실발송 검증(키 확보 후)
- 소셜 로그인 공식 로고 SVG 교체(현재 원형 플레이스홀더)
- 인증 화면 외 다른 페이지의 디자인 톤 통일
