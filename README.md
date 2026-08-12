# 한평생 바로취업

중장년을 중심으로 취업 가능성을 분석하고, **직업 → 채용 → 지원금 → 자격/교육 → 취업**까지 개인별 취업경로를 연결하는 Career Platform입니다.

핵심 자산은 **영업 가능한 Career DB**입니다. 회원 행동이 누적되면 Lead Score·추천·CRM 상담으로 연결됩니다.

---

## 기술스택

- Next.js 16 (App Router)
- TypeScript (strict)
- Tailwind CSS 4
- shadcn/ui + lucide-react
- `@supabase/supabase-js` (STEP 2)
- PostgreSQL via Supabase

패키지 매니저: **npm**

---

## 실행방법

```bash
npm install
npm run dev
```

- 사용자: http://localhost:3000
- 관리자: http://localhost:3000/admin

```bash
npm run build
npm run start
```

---

## 환경변수 / Mock Mode / Supabase Mode

`.env.example` 을 복사해 `.env.local` 을 만듭니다.

```bash
cp .env.example .env.local
```

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 (클라이언트 노출 금지) |
| `DATA_SOURCE_MODE` | 선택: `mock` \| `supabase` (구버전 이름 `DATA_SOURCE` 도 지원) |
| `ALLOW_MOCK_FALLBACK_IN_PRODUCTION` | 선택: `true`일 때만 운영환경에서도 Mock 폴백을 허용 (기본 `false`, 권장하지 않음) |
| `WORK24_API_KEY` | 선택 (STEP 4). 없으면 MockJobProvider로 동작 |
| `PUBLIC_SERVICE_API_KEY` | 선택 (STEP 5.5). 없으면 MockSupportProvider로 동작 |

### Supabase Auth 설정 (STEP 6)

일반 회원 Auth(로그인/회원가입/세션)는 **anon key + 로그인 세션(JWT)** 만 사용하고, `SUPABASE_SERVICE_ROLE_KEY`는
관리자/서버 전용 배치 작업(회원 목록 집계 등)에만 사용한다. 자세한 구조는 [docs/auth-career-identity.md](./docs/auth-career-identity.md) 참고.

이메일 인증/비밀번호 재설정 링크가 정상 동작하려면 Supabase Dashboard에서 아래를 설정해야 한다:

1. **Authentication → URL Configuration**: Site URL과 Redirect URLs에 `{배포 도메인}/auth/confirm`을 추가
   (로컬 개발: `http://localhost:3000/auth/confirm`).
2. **Authentication → Email Templates**: "Confirm signup"/"Reset Password" 템플릿의 링크를
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next=/mypage` 형태로 설정.
3. 개발환경에서 "Confirm email"을 꺼두면(Authentication → Providers → Email) 회원가입 즉시 세션이 발급되어
   이메일 인증 없이도 로그인/서비스 이용 Flow가 그대로 동작한다 (앱 코드가 두 경우를 모두 처리함).

- **환경변수가 비어 있으면 Mock Mode**로 동작합니다. build/dev가 깨지지 않습니다.
- **개발환경(`NODE_ENV !== "production"`)**: Supabase Mode인데 클라이언트 생성/쿼리에 실패하면 콘솔에 경고를 남기고 Mock으로 폴백합니다.
- **운영환경(`NODE_ENV === "production"`)**: Supabase 연결/쿼리 실패 시 자동으로 Mock에 폴백하지 않고 `DataSourceError`를 던집니다. 저장 실패가 성공처럼 처리되지 않도록 하기 위한 정책입니다 (`src/lib/data/mode.ts`, `src/lib/data/resolve-repository.ts`, `src/lib/data/errors.ts`).

---

## Supabase Migration 실행방법

```bash
# Supabase CLI 예시 (DB Password로 직접 연결 가능한 환경)
supabase link --project-ref <project-ref>
supabase db push
# 또는
supabase migration up
```

### CLI/DB Password를 쓸 수 없는 환경 (Docker 미설치 등)

DB Password 없이 **Supabase Management API + Personal Access Token(PAT)** 만으로 migration을 적용하는 대안 스크립트를 제공합니다.

```bash
# .env.local에 SUPABASE_ACCESS_TOKEN(PAT, DB Password 아님) 추가 후
npm run check:remote-schema   # 원격 DB 현재 상태(테이블/적용된 migration) 확인
npm run migrate:remote        # supabase/migrations/*.sql을 순서대로 적용
npm run check:seed-data       # 시드 데이터 row count 확인
```

- `scripts/apply-migrations.ts`는 각 migration 파일을 `BEGIN/COMMIT`으로 감싸 파일 단위 원자성을 보장하고, `public._migration_log` 테이블에 적용 이력을 기록해 재실행 시 이미 적용된 파일은 건너뜁니다.
- 실패 시 DB reset이나 기존 migration 수정 없이, 실패한 파일과 SQL 오류를 그대로 출력하고 중단합니다.
- PAT는 migration 적용 등 1회성 관리 작업에만 사용하고, 필요 없어지면 Supabase Dashboard에서 Revoke하는 것을 권장합니다 (앱 런타임은 `SUPABASE_SERVICE_ROLE_KEY`/anon key만 사용하며 PAT를 필요로 하지 않습니다).

Migration 위치: `supabase/migrations/`

1. `0001_profiles.sql` … `0014_indexes.sql` — 스키마/RLS/인덱스  
2. `0015_seed.sql` — 개발용 Seed (auth.users stub 포함, local 권장)
3. `0016_assessment_v2.sql` — STEP 3: 검사 문항/옵션/결과 확장 컬럼 + `occupation_matching_rules` 테이블
4. `0016a_step3_5_deprecated_columns_nullable.sql` — STEP 3.5: 실제 원격 DB 적용 중 발견한 버그 수정. `assessment_questions.prompt`/`assessment_options.label`이 deprecated인데도 NOT NULL로 남아있어 0017 시드가 실패하던 문제 해결 (0017보다 먼저 적용되도록 파일명 정렬)
5. `0017_assessment_v2_seed.sql` — STEP 3: V1 Career Assessment(문항 25개) + Occupation 20개 + Matching Rule Seed (`scripts/generate-assessment-seed.ts`로 Mock과 동기화 생성)
6. `0018_step3_5_constraints_and_rpc.sql` — STEP 3.5: `current_section` 컬럼, Index/Unique 제약 보강, `anonymous_id → user_id` 원자적 병합 RPC(`link_anonymous_career_data`)
7. `0019_step3_5_rls_fixes.sql` — STEP 3.5: `occupations`/`qualifications` public read RLS 버그 수정, `occupation_matching_rules` RLS 신규 적용
8. `0020_step3_5_jobs_readiness.sql` — STEP 3.5: STEP 4(외부 채용공고 API) 대비 `jobs` 테이블에 `external_source`/`external_id`/`raw_payload` 등 컬럼 및 중복 방지 인덱스 추가 (아직 외부 API 연동 없음)
9. `0021_step3_5_deactivate_legacy_assessments.sql` — STEP 3.5: 실제 E2E 검증 중 발견한 버그 수정. 문항이 하나도 없는 STEP 2 placeholder 검사(0015 seed)가 `is_active=true`로 남아있어 "활성 검사 중 무작위 선택" 로직이 실제 V2 검사 대신 이를 고를 수 있던 문제 해결
10. `0022_step3_5_anon_rls_readback_fix.sql` — STEP 3.5: 실제 anon key로 RLS를 직접 검증하며 발견한 버그 수정. 비회원(`user_id IS NULL`) 행에 대해 INSERT(WITH CHECK)는 허용되면서 SELECT(USING)는 허용되지 않아 `insert().select()` 직후 읽기가 실패하던 비대칭 정책을 대칭으로 수정
11. `0023_step4_jobs_expand.sql` ~ `0026_step4_jobs_missing_columns_fix.sql` — STEP 4: 채용공고(`jobs`) 외부 Provider 연동 컬럼 확장, `job_sync_runs`, RLS/인덱스 보강
12. `0027_step5_support_expand.sql` ~ `0030_step5_support_rls_indexes.sql` — STEP 5: 지원제도(`support_programs`) 확장, `support_sync_runs`/`support_bookmarks`/`support_program_rules`/`support_assessment_sessions`, RLS/인덱스
13. `0031_step5_support_match_detail.sql` — STEP 5: `match_results.detail` jsonb 컬럼 추가 (matchedConditions/missingConditions 등 지원제도 매칭 상세 저장)
14. `0032_step5_5_career_relevance.sql` — STEP 5.5: 실 공공서비스 API 연동을 위한 career relevance 관련 컬럼
15. `0033_step6_auth_identity_trigger.sql` — **STEP 6**: `auth.users` insert 시 `profiles`/`user_roles`/`career_profiles`/`user_acquisition`을 원자적으로 생성하는 DB Trigger(`handle_new_auth_user`). role은 항상 `'USER'`로 고정(클라이언트가 권한 상승 불가). 관리자 회원목록 정렬/검색용 인덱스(`created_at`, `lower(email)`) 추가

### Supabase Smoke Test

Supabase 환경변수(`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)가 설정된 프로젝트에 대해
CareerProfile CRUD → Assessment Session/Answer/Result → Job Interest → Match Result → Activity Event →
Lead 재계산 → 비회원(anonymous_id) 검사 흐름 → `link_anonymous_career_data` RPC 병합까지 실제로 저장/조회되는지 검증합니다.

```bash
npm run smoke:supabase
```

환경변수가 없으면 스킵 메시지만 출력하고 exit code 0으로 종료합니다 (build를 막지 않음). 테스트 중 생성한 데이터와 임시 회원 계정은 종료 시 모두 정리됩니다.

추가로 실제 서비스 레이어(`assessment-service.ts`)를 그대로 통과하는 E2E 검사 Flow 검증, 그리고 anon key로 RLS를 직접 검증하는 스크립트도 제공합니다.

```bash
npm run e2e:assessment   # 검사 시작 → 전체 문항 답변 → 완료까지 실제 서비스 코드로 1회 실행
npm run e2e:job          # STEP 4: Job Sync → 검색 → 조회/찜/지원클릭 → Lead 재계산까지 실제 서비스 코드로 1회 실행
npm run e2e:support      # STEP 5: 지원금 진단 → Match → 찜/신청클릭 → Lead 재계산 (MockSupportProvider 고정)
npm run e2e:support:public # STEP 5.5: 위와 동일하되 실제 공공서비스 API(PublicServiceSupportProvider)로 검증
npm run check:anon-rls   # anon key로 공개 데이터 조회 / 비회원 검사 시작 / 민감정보 차단을 직접 검증
```

### Auth / Member-first 검증 (STEP 6)

```bash
npm run smoke:auth          # 실제 Supabase Auth + RLS를 authenticated USER JWT로 검증
                             # (테스트 회원 생성 → Trigger로 Profile/CareerProfile 생성 확인 → 로그인 세션 →
                             #  본인 데이터 조회/수정 → 타인 데이터 접근 차단 → next redirect 정책 → 로그아웃 → cleanup)
npm run e2e:member-flow     # 회원가입 → 로그인 → 직업진단 → 채용공고 조회/찜 → 지원금진단 →
                             # Match/Activity/Lead → /mypage 데이터 확인 → 로그아웃(접근 차단) → 재로그인(데이터 유지)
npm run cleanup:seed-accounts        # 0015 seed / e2e 스크립트가 만든 *@baro.local 테스트 계정 목록 확인 (dry-run 기본)
npm run cleanup:seed-accounts -- --delete  # 위 계정을 실제로 삭제 (운영 배포 전에만 사용)
```

자세한 구조: [docs/database-architecture.md](./docs/database-architecture.md), [docs/auth-career-identity.md](./docs/auth-career-identity.md)

---

## 현재 구현범위

### STEP 1
- 사용자 홈 / 서비스 페이지
- 관리자 백오피스 골격
- Domain 타입, Matching Engine, Lead Score, Activity Logger, Mock Repository

### STEP 2 (이번)
- Supabase 클라이언트 분리 (browser / server / admin)
- SQL Migration (Career DB, Tags, Content Rules, Activity, Lead, RLS, Seed)
- Repository Mock ↔ Supabase 전환
- Lead Score 재계산 서비스 (`recalculateLeadScore`)
- Content Recommendation Rule 평가
- USER→CONTENT / CONTENT→USERS Matching
- `/admin/users/[id]` Career CRM 상세
- `/admin/contents` CRUD + 잠재고객 분석
- `/admin/analytics` UTM·KPI 기본 분석

### STEP 3 (이번)
- "내게 맞는 직업 찾기" 검사를 실제 Career DB 생성기로 완성
- `assessments`/`assessment_questions`/`assessment_options` 기반 DB 렌더링 (하드코딩 없음)
- Assessment Engine 파이프라인 (`src/features/assessment-engine/`): 정규화 → Profile 추출 → Dimension Scoring → Occupation Matching → Tag 생성 → Result 빌드
- `occupation_matching_rules` 기반 매칭 (직업명 if문 하드코딩 없음), Occupation 20개+ Seed
- 검사 완료 시 CareerProfile 병합 / User Tags 생성 / User Job Interest 갱신 / Match Result 저장 / Content 추천 / Lead Score 재계산 자동 연동
- `anonymous_id` 기반 비회원 검사 + 회원가입 시 `linkAnonymousCareerDataToUser()` 로 데이터 병합
- `/admin/assessments`, `/admin/assessments/[id]` (개요/문항/결과/분석 탭) 백오피스
- `/admin/users/[id]`, `/mypage` 검사 결과 연동

### STEP 4
- "채용공고" Vertical Slice: `/jobs`, `/jobs/[id]`
- Work24 Provider Architecture (`Work24JobProvider` / `MockJobProvider`, `WORK24_API_KEY` 미설정 시 자동 Mock)
- Job Search / Match / Bookmark / Apply Click → Career Interest / Lead / CRM 연동
- `/admin/jobs` Sync 관리

### STEP 5 / 5.5
- "지원금 찾기" Vertical Slice: `/support`, `/support/[id]`, `/support/result/[sessionId]`
- 행정안전부 대한민국 공공서비스(혜택) 실 API 연동 (`PublicServiceSupportProvider`, `PUBLIC_SERVICE_API_KEY` 미설정 시 Mock)
- 실 API → Adapter → Supabase(`support_programs`) → Support Match(`match_results.detail`) → UI → CRM
- `/admin/support` Sync 관리

### STEP 6 (이번)
- **Member-first 아키텍처**: `/assessment/**`, `/jobs/**`, `/support/**`, `/mypage/**`는 로그인 필수. 비회원 접근 시 `/login?next=원래URL`로 redirect
- Supabase Auth (이메일 회원가입/로그인/로그아웃/이메일 인증/비밀번호 재설정). `@supabase/ssr` 기반 Server/Browser Client 분리
- `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/confirm`(이메일 링크 콜백)
- DB Trigger(`handle_new_auth_user`, 0033 migration)로 회원가입 시 `profiles`/`user_roles`/`career_profiles`/`user_acquisition`을 원자적으로 생성 (half-created 상태 방지)
- `src/proxy.ts`(Next.js Proxy) + `requireAdmin()`/`requireUser()`(Server Component Guard)로 2단 방어, RLS가 최종 방어선
- `/mypage`, `/mypage/profile`(프로필 수정), `/admin/users`, `/admin/users/[id]`를 실제 Supabase 데이터로 전환 (Mock user 의존 제거), `/admin/users` server-side pagination + 검색/필터
- `/admin/analytics`에 Auth 지표(가입/로그인/활성회원/신규회원, Member-first Funnel) 추가
- Marketing Consent(마케팅 수신 동의)를 Lead Grade와 분리 표시
- 신규 검증 스크립트: `npm run smoke:auth`, `npm run e2e:member-flow`
- 자세한 구조/Route 권한표: [docs/auth-career-identity.md](./docs/auth-career-identity.md)

### 아직 하지 않음
- 카카오/네이버/Google 소셜 로그인, 휴대폰 본인인증(SMS)
- AI 이력서/자기소개서(STEP 7 예정), 결제, LMS, 문자/전화 자동화
- 실제 취업률 예측 AI
- 회원 탈퇴 기능 (정책 문서화만 완료 — [docs/auth-career-identity.md](./docs/auth-career-identity.md) 8절)

---

## Route 목록

### 공개 (비회원 접근 가능)
`/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/confirm`

### 보호 (로그인 필수 — 비로그인 시 `/login?next=...`로 redirect)
`/assessment`, `/assessment/[sessionId]`, `/assessment/result/[sessionId]`, `/jobs`, `/jobs/[id]`, `/support`, `/support/[id]`, `/support/result/[sessionId]`, `/resume`, `/consulting`, `/mypage`, `/mypage/profile`

### 관리자 (로그인 + ADMIN/SUPER_ADMIN role 필요 — 서버에서 실제 DB role 조회)
`/admin`, `/admin/users`, `/admin/users/[id]`, `/admin/contents`, `/admin/contents/new`, `/admin/contents/[id]`, `/admin/jobs`, `/admin/support`, `/admin/assessments`, `/admin/assessments/[id]`, `/admin/resumes`, `/admin/consultations`, `/admin/leads`, `/admin/analytics`

---

## Domain / Career DB

| Domain | 설명 |
| --- | --- |
| Profile | auth.users 연결, 마케팅/개인정보 동의 분리 |
| CareerProfile | 1 User = 1 Profile, 취업 희망조건 |
| Tags / Interests | 범용 태그·직업·자격·콘텐츠 관심 |
| Content Catalog | 확장형 콘텐츠 + Recommendation Rules |
| Activity Event | anonymous_id 지원, UTM 포함 |
| Lead | score + grade + score_breakdown |
| MatchResult | JOB/CONTENT/SUPPORT/OCCUPATION 추천 결과 |

---

## Lead Scoring

규칙 파일: `src/lib/leads/scoring-rules.ts`  
신호 생성: `src/lib/leads/signal-builder.ts` (Activity + CareerProfile)  
재계산: `src/services/lead-score.service.ts` → 관리자 상세의 **Lead 점수 재계산**

---

## Content Matching

- Rule 행: `field` / `operator` / `value` / `weight` / `is_required`
- 평가: `src/lib/matching/rule-evaluator.ts`
- Engine: `src/lib/matching/engine.ts` (레거시 객체 규칙 + DB Rule 행 동시 지원)
- 잠재고객 분석: Content 상세 페이지
- 회원 추천: User 상세 페이지

---

## Activity Event

- Interface: `ActivityEventLogger`
- Mock: Memory logger
- Supabase: `activity_events` insert (Service Role)
- 회원가입 전 `anonymous_id` 컬럼 지원 (SQL)

---

## Career Assessment Engine (STEP 3)

- 진입: `/assessment` (Intro) → `/assessment/[sessionId]` (Wizard, 1~2문항/화면) → `/assessment/result/[sessionId]`
- 질문 렌더링: `src/features/assessment/question-renderer.tsx` (answer_type별 UI: SINGLE/MULTI/SCALE/NUMBER/TEXT/REGION/SALARY_RANGE/QUALIFICATION_MULTI)
- Engine 파이프라인: `src/features/assessment-engine/`
  - `question-loader` → `answer-normalizer` → `profile-extractor` + `dimension-scorer` → `occupation-matcher` → `tag-generator` → `result-builder`
- 서비스 오케스트레이션: `src/features/assessment/assessment-actions.ts` (Server Actions) → `src/features/assessment-engine/assessment-service.ts`
- 추천 점수(0~100)와 준비도(0~100)는 `occupation_matching_rules`의 dimension/target_value/weight로 계산되며, 직업명을 코드에 하드코딩하지 않음
- 완료 시 자동 연동: CareerProfile 병합(`career-profile-merge.service.ts`) / User Tags / User Job Interest / Match Result(`OCCUPATION`) / Content 추천 / `recalculateLeadScore()`
- 비회원 지원: `src/lib/anonymous/anonymous-id.ts` + `src/services/identity-link.service.ts`(`linkAnonymousCareerDataToUser`)

---

## 폴더 구조 (핵심)

```
src/
  proxy.ts              # Next.js Proxy (구 middleware) - 보호/관리자 Route Auth Guard, UTM 캡처
  app/admin/           # 관리자 페이지 + server actions
  app/(site)/assessment # 검사 Intro/Wizard/결과 라우트
  app/(site)/mypage    # 마이페이지 + 프로필 수정
  app/(auth 관련)/login, signup, forgot-password, reset-password
  app/auth/confirm     # Supabase Auth 이메일 링크 콜백 (Route Handler)
  features/
    auth/               # 회원가입/로그인/로그아웃/비밀번호 재설정 Server Actions + UI
    assessment/         # UI (wizard, question-renderer, result-view ...)
    assessment-engine/   # 채점/매칭 파이프라인 (question-loader ~ result-builder)
    profile/            # /mypage/profile 수정 Server Action + Form
    admin/               # 관리자 전용 컴포넌트
  services/            # UI → Service → Repository
    auth-identity.service.ts   # ensureUserProfile() - idempotent Career Identity 생성
    auth-analytics.service.ts  # /admin/analytics Auth 지표
    admin-user-list.service.ts # /admin/users server-side pagination + 검색/필터
  lib/
    supabase/          # browser(anon) / server(anon+세션) / admin(service_role)
    auth/              # session.ts(DAL: getCurrentUser/requireUser/requireAdmin), roles.ts(Client-safe), redirect.ts(next 검증)
    data/mode.ts       # mock | supabase
    repositories/      # mock + supabase 구현
    matching/ leads/ activity/
    anonymous/          # anonymous_id 생성/저장 (호환 유지용, 정상 Flow의 중심은 아님)
  mocks/               # Mock Seed
supabase/migrations/   # SQL
scripts/generate-assessment-seed.ts  # Mock → Supabase Seed SQL 생성기
scripts/smoke-auth.ts, e2e-member-flow.ts, cleanup-seed-accounts.ts  # STEP 6 검증 스크립트
docs/database-architecture.md
docs/auth-career-identity.md         # STEP 6: Member-first 구조, Route 권한표, Career Identity 확장 설계
```

---

## 신규 콘텐츠 추가 흐름

1. `/admin/contents/new` 에서 콘텐츠 등록  
2. (DB) `content_recommendation_rules` 에 Rule 추가  
3. Matching Engine이 기존 CareerProfile 전체와 재매칭  
4. Content 상세에서 잠재고객 A/B/C 확인  
5. 코드 수정 없이 Catalog 확장
