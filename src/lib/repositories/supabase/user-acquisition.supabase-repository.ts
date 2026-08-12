import type { UserAcquisition } from "@/types";
import type { UserAcquisitionRepository } from "../user-acquisition-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): UserAcquisition {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    utmSource: (row.utm_source as string | null) ?? undefined,
    utmMedium: (row.utm_medium as string | null) ?? undefined,
    utmCampaign: (row.utm_campaign as string | null) ?? undefined,
    utmContent: (row.utm_content as string | null) ?? undefined,
    utmTerm: (row.utm_term as string | null) ?? undefined,
    landingPage: (row.landing_page as string | null) ?? undefined,
    referrer: (row.referrer as string | null) ?? undefined,
    firstTouchAt: String(row.first_touch_at),
    lastTouchAt: String(row.last_touch_at),
  };
}

export function createSupabaseUserAcquisitionRepository(): UserAcquisitionRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findByUserId(userId: string) {
      const result = await client.from("user_acquisition").select("*").eq("user_id", userId).maybeSingle();
      const row = unwrapMaybe("UserAcquisitionRepository.findByUserId", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
  };
}
