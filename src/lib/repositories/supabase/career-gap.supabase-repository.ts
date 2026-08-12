import type { CareerGapAnalysis, CareerGapItem } from "@/types";
import type { CareerGapRepository } from "../career-gap-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapAnalysisRow(row: Record<string, unknown>): CareerGapAnalysis {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    occupationId: (row.occupation_id as string | null) ?? undefined,
    employmentDestinationId: (row.employment_destination_id as string | null) ?? undefined,
    targetJobId: (row.target_job_id as string | null) ?? undefined,
    marketSampleSize: Number(row.market_sample_size ?? 0),
    confidence: (row.confidence as CareerGapAnalysis["confidence"]) ?? "LOW",
    readinessScore: Number(row.readiness_score ?? 0),
    currentEligibleJobCount: Number(row.current_eligible_job_count ?? 0),
    analysisVersion: Number(row.analysis_version ?? 1),
    createdAt: String(row.created_at),
  };
}

function mapItemRow(row: Record<string, unknown>): CareerGapItem {
  return {
    id: String(row.id),
    analysisId: String(row.analysis_id),
    requirementId: String(row.requirement_id),
    marketRequiredRate: Number(row.market_required_rate ?? 0),
    marketPreferredRate: Number(row.market_preferred_rate ?? 0),
    marketMentionRate: Number(row.market_mention_rate ?? 0),
    userStatus: (row.user_status as CareerGapItem["userStatus"]) ?? "UNKNOWN",
    importanceScore: Number(row.importance_score ?? 0),
    gapScore: Number(row.gap_score ?? 0),
    priorityScore: Number(row.priority_score ?? 0),
    projectedEligibleJobCount: (row.projected_eligible_job_count as number | null) ?? undefined,
    reason: (row.reason as string | null) ?? undefined,
    orderIndex: Number(row.order_index ?? 0),
    createdAt: String(row.created_at),
  };
}

export function createSupabaseCareerGapRepository(): CareerGapRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async createAnalysis(input, itemInputs) {
      const now = new Date().toISOString();
      const { data: analysisRow, error: analysisError } = await client
        .from("career_gap_analyses")
        .insert({
          user_id: input.userId,
          occupation_id: input.occupationId ?? null,
          employment_destination_id: input.employmentDestinationId ?? null,
          target_job_id: input.targetJobId ?? null,
          market_sample_size: input.marketSampleSize,
          confidence: input.confidence,
          readiness_score: input.readinessScore,
          current_eligible_job_count: input.currentEligibleJobCount,
          analysis_version: input.analysisVersion ?? 1,
          created_at: now,
        })
        .select("*")
        .single();
      if (analysisError || !analysisRow) {
        throwDataSourceError("CareerGapRepository.createAnalysis", analysisError ?? new Error("no data returned"));
      }
      const analysis = mapAnalysisRow(analysisRow as Record<string, unknown>);

      if (itemInputs.length === 0) return { analysis, items: [] };

      const rows = itemInputs.map((item) => ({
        analysis_id: analysis.id,
        requirement_id: item.requirementId,
        market_required_rate: item.marketRequiredRate,
        market_preferred_rate: item.marketPreferredRate,
        market_mention_rate: item.marketMentionRate,
        user_status: item.userStatus,
        importance_score: item.importanceScore,
        gap_score: item.gapScore,
        priority_score: item.priorityScore,
        projected_eligible_job_count: item.projectedEligibleJobCount ?? null,
        reason: item.reason ?? null,
        order_index: item.orderIndex,
        created_at: now,
      }));
      const { data: itemRows, error: itemError } = await client.from("career_gap_items").insert(rows).select("*");
      if (itemError) throwDataSourceError("CareerGapRepository.createAnalysis(items)", itemError);
      return { analysis, items: (itemRows ?? []).map((row) => mapItemRow(row as Record<string, unknown>)) };
    },
    async findAnalysisById(id) {
      const result = await client.from("career_gap_analyses").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("CareerGapRepository.findAnalysisById", result);
      return row ? mapAnalysisRow(row as Record<string, unknown>) : null;
    },
    async findItemsByAnalysisId(analysisId) {
      const result = await client
        .from("career_gap_items")
        .select("*")
        .eq("analysis_id", analysisId)
        .order("order_index", { ascending: true });
      const rows = unwrapList("CareerGapRepository.findItemsByAnalysisId", result);
      return rows.map((row) => mapItemRow(row as Record<string, unknown>));
    },
    async findAnalysesByUserId(userId, limit = 10) {
      const result = await client
        .from("career_gap_analyses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      const rows = unwrapList("CareerGapRepository.findAnalysesByUserId", result);
      return rows.map((row) => mapAnalysisRow(row as Record<string, unknown>));
    },
    async findAllAnalyses(limit = 500) {
      const result = await client.from("career_gap_analyses").select("*").order("created_at", { ascending: false }).limit(limit);
      const rows = unwrapList("CareerGapRepository.findAllAnalyses", result);
      return rows.map((row) => mapAnalysisRow(row as Record<string, unknown>));
    },
    async findItemsByAnalysisIds(analysisIds) {
      if (analysisIds.length === 0) return [];
      const result = await client.from("career_gap_items").select("*").in("analysis_id", analysisIds);
      const rows = unwrapList("CareerGapRepository.findItemsByAnalysisIds", result);
      return rows.map((row) => mapItemRow(row as Record<string, unknown>));
    },
  };
}
