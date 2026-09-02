import type { Profile } from "@/types";
import type { ProfileRepository } from "../profile-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    name: (row.name as string | null) ?? undefined,
    phone: (row.phone as string | null) ?? undefined,
    email: (row.email as string | null) ?? undefined,
    birthYear: (row.birth_year as number | null) ?? undefined,
    gender: (row.gender as string | null) ?? undefined,
    regionSido: (row.region_sido as string | null) ?? undefined,
    regionSigungu: (row.region_sigungu as string | null) ?? undefined,
    role: (row.role as Profile["role"]) ?? "USER",
    marketingConsent: Boolean(row.marketing_consent),
    marketingConsentAt: (row.marketing_consent_at as string | null) ?? undefined,
    privacyConsentAt: (row.privacy_consent_at as string | null) ?? undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastActiveAt: (row.last_active_at as string | null) ?? undefined,
  };
}

export function createSupabaseProfileRepository(): ProfileRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findById(userId: string) {
      const result = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
      const row = unwrapMaybe("ProfileRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async update(userId, patch) {
      const payload: Record<string, unknown> = {};
      if (patch.name !== undefined) payload.name = patch.name;
      if (patch.phone !== undefined) payload.phone = patch.phone;
      if (patch.email !== undefined) payload.email = patch.email;
      if (patch.marketingConsent !== undefined) {
        payload.marketing_consent = patch.marketingConsent;
        payload.marketing_consent_at = patch.marketingConsentAt ?? null;
      }
      if (Object.keys(payload).length === 0) return this.findById(userId);

      const result = await client.from("profiles").update(payload).eq("id", userId).select("*").maybeSingle();
      const row = unwrapMaybe("ProfileRepository.update", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
  };
}
