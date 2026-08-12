import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isProductionEnv } from "@/lib/data/mode";
import type { AcquisitionTouch } from "@/lib/acquisition/acquisition-cookies";

export interface EnsureUserProfileInput {
  userId: string;
  email?: string | null;
  name?: string;
  phone?: string;
  marketingConsent?: boolean;
  privacyConsentAt?: string;
}

/**
 * 회원가입 시 DB Trigger(handle_new_auth_user, 0033 migration)가 profiles/user_roles/
 * career_profiles/user_acquisition을 원자적으로 생성한다.
 *
 * 이 함수는 그 결과를 검증하고, 트리거가 어떤 이유로든 아직 적용되지 않은 레거시 사용자나
 * 실패 케이스를 위한 idempotent 안전망이다 (half-created 상태 방지, 스펙 35번).
 * role은 이 함수를 통해 절대 변경하지 않는다 (권한 상승 방지 - role 변경은 관리자 전용 경로만 허용).
 */
export async function ensureUserProfile(input: EnsureUserProfileInput): Promise<void> {
  const client = createAdminSupabaseClient();
  if (!client) {
    const message = "[ensureUserProfile] Admin 클라이언트를 생성할 수 없습니다 (SUPABASE_SERVICE_ROLE_KEY 확인 필요).";
    if (isProductionEnv()) throw new Error(message);
    console.warn(message);
    return;
  }

  const { data: existing } = await client.from("profiles").select("id").eq("id", input.userId).maybeSingle();

  if (!existing) {
    // 트리거가 어떤 이유로든 동작하지 않은 경우의 안전망 - 최소 프로필을 생성한다.
    await client.from("profiles").insert({
      id: input.userId,
      name: input.name,
      phone: input.phone,
      email: input.email ?? undefined,
      role: "USER",
      marketing_consent: input.marketingConsent ?? false,
      marketing_consent_at: input.marketingConsent ? new Date().toISOString() : null,
      privacy_consent_at: input.privacyConsentAt ?? new Date().toISOString(),
    });
    await client.from("user_roles").upsert({ user_id: input.userId, role: "USER" }, { onConflict: "user_id,role" });
    await client.from("career_profiles").upsert({ user_id: input.userId }, { onConflict: "user_id" });
    await client.from("user_acquisition").upsert({ user_id: input.userId }, { onConflict: "user_id" });
  }
}

export interface ApplyAcquisitionTouchInput {
  userId: string;
  firstTouch: AcquisitionTouch | null;
  lastTouch: AcquisitionTouch | null;
}

/**
 * 회원가입 시점의 first/last-touch 쿠키(proxy.ts에서 캡처)를 user_acquisition에 반영한다.
 *
 * DB Trigger가 signup 순간 user_acquisition 행을 이미 만들어두지만 UTM 정보는 비어 있다
 * (트리거는 HTTP 요청 컨텍스트에 접근할 수 없음). first_touch_at은 "실제 최초 방문 시각"
 * (firstTouch 쿠키의 capturedAt)으로 교체하고, 이후에는 다시 덮어쓰지 않는다.
 */
export async function applyAcquisitionTouch(input: ApplyAcquisitionTouchInput): Promise<void> {
  if (!input.firstTouch && !input.lastTouch) return;
  const client = createAdminSupabaseClient();
  if (!client) return;

  const touch = input.lastTouch ?? input.firstTouch!;
  const first = input.firstTouch ?? input.lastTouch!;

  await client
    .from("user_acquisition")
    .update({
      utm_source: touch.utmSource ?? null,
      utm_medium: touch.utmMedium ?? null,
      utm_campaign: touch.utmCampaign ?? null,
      utm_content: touch.utmContent ?? null,
      utm_term: touch.utmTerm ?? null,
      landing_page: first.landingPage ?? null,
      referrer: first.referrer ?? null,
      first_touch_at: first.capturedAt,
      last_touch_at: touch.capturedAt,
    })
    .eq("user_id", input.userId);
}
