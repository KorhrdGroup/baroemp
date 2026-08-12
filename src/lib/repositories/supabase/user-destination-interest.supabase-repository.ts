import type { UserEmploymentDestinationInterest } from "@/types";
import type { UserDestinationInterestRepository } from "../user-destination-interest-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList } from "./query-helpers";

function mapRow(row: Record<string, unknown>): UserEmploymentDestinationInterest {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    occupationId: (row.occupation_id as string | null) ?? undefined,
    employmentDestinationId: (row.employment_destination_id as string | null) ?? undefined,
    createdAt: String(row.created_at),
  };
}

export function createSupabaseUserDestinationInterestRepository(): UserDestinationInterestRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async upsert(input) {
      const { data, error } = await client
        .from("user_employment_destination_interests")
        .upsert(
          {
            user_id: input.userId,
            occupation_id: input.occupationId ?? null,
            employment_destination_id: input.employmentDestinationId ?? null,
          },
          { onConflict: "user_id,occupation_id,employment_destination_id" },
        )
        .select("*")
        .single();
      if (error || !data) {
        throwDataSourceError("UserDestinationInterestRepository.upsert", error ?? new Error("no data returned"));
      }
      return mapRow(data as Record<string, unknown>);
    },
    async findByUserId(userId) {
      const result = await client.from("user_employment_destination_interests").select("*").eq("user_id", userId);
      const rows = unwrapList("UserDestinationInterestRepository.findByUserId", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
  };
}
