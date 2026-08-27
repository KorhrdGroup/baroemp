import type { PhoneVerification, PhoneVerificationCreateInput } from "@/types";
import type { PhoneVerificationRepository } from "../phone-verification-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): PhoneVerification {
  return {
    id: String(row.id),
    phone: String(row.phone),
    purpose: row.purpose as PhoneVerification["purpose"],
    codeHash: String(row.code_hash),
    expiresAt: String(row.expires_at),
    attemptCount: Number(row.attempt_count ?? 0),
    verifiedAt: (row.verified_at as string | null) ?? undefined,
    consumedAt: (row.consumed_at as string | null) ?? undefined,
    createdAt: String(row.created_at),
  };
}

export function createSupabasePhoneVerificationRepository(): PhoneVerificationRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async create(input: PhoneVerificationCreateInput) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("phone_verifications")
        .insert({
          phone: input.phone,
          purpose: input.purpose,
          code_hash: input.codeHash,
          expires_at: input.expiresAt,
          attempt_count: 0,
          created_at: now,
        })
        .select("*")
        .single();
      if (error || !data) {
        throwDataSourceError("PhoneVerificationRepository.create", error ?? new Error("no data returned"));
      }
      return mapRow(data as Record<string, unknown>);
    },
    async findById(id) {
      const result = await client.from("phone_verifications").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("PhoneVerificationRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async findLatestActive(phone, purpose) {
      const nowIso = new Date().toISOString();
      const result = await client
        .from("phone_verifications")
        .select("*")
        .eq("phone", phone)
        .eq("purpose", purpose)
        .is("consumed_at", null)
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const row = unwrapMaybe("PhoneVerificationRepository.findLatestActive", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async countSendsSince(phone, since) {
      const result = await client
        .from("phone_verifications")
        .select("id", { count: "exact", head: true })
        .eq("phone", phone)
        .gte("created_at", since);
      if (result.error) {
        throwDataSourceError("PhoneVerificationRepository.countSendsSince", result.error);
      }
      return result.count ?? 0;
    },
    async incrementAttempt(id) {
      const result = await client
        .from("phone_verifications")
        .select("attempt_count")
        .eq("id", id)
        .maybeSingle();
      const row = unwrapMaybe("PhoneVerificationRepository.incrementAttempt", result);
      const nextCount = Number((row as Record<string, unknown> | null)?.attempt_count ?? 0) + 1;

      const updateResult = await client
        .from("phone_verifications")
        .update({ attempt_count: nextCount })
        .eq("id", id)
        .select("attempt_count")
        .maybeSingle();
      const updatedRow = unwrapMaybe("PhoneVerificationRepository.incrementAttempt", updateResult);
      return Number((updatedRow as Record<string, unknown> | null)?.attempt_count ?? nextCount);
    },
    async markVerified(id) {
      const result = await client
        .from("phone_verifications")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", id);
      if (result.error) {
        throwDataSourceError("PhoneVerificationRepository.markVerified", result.error);
      }
    },
    async markConsumed(id) {
      const result = await client
        .from("phone_verifications")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", id);
      if (result.error) {
        throwDataSourceError("PhoneVerificationRepository.markConsumed", result.error);
      }
    },
    async expire(id) {
      const result = await client
        .from("phone_verifications")
        .update({ expires_at: new Date(0).toISOString() })
        .eq("id", id);
      if (result.error) {
        throwDataSourceError("PhoneVerificationRepository.expire", result.error);
      }
    },
  };
}
