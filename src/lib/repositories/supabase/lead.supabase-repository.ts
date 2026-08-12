import type { Lead, LeadScoreBreakdown } from "@/types";
import type { LeadFilter, LeadInput, LeadRepository } from "../lead-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

type SupabaseClientLike = ReturnType<typeof createAdminSupabaseClient>;

/**
 * Lead는 leads 테이블 1행 + profiles.name + career_profiles(연령/지역/희망시기) +
 * contents.title(추천 콘텐츠명)을 합친 CRM 뷰 모델이다.
 * leads 테이블 자체에는 name/age_group/region 컬럼이 없으므로 조회 시점에 join 하여 채운다.
 * interestedJobLabel(관심 직업 라벨)은 leads.primary_interest 컬럼에 저장한다.
 * STEP 4부터 primary-interest.service.ts가 계산한 값을 recalculateLeadScore가 기록한다.
 */
async function enrichLeads(client: NonNullable<SupabaseClientLike>, rows: Record<string, unknown>[]): Promise<Lead[]> {
  if (rows.length === 0) return [];
  const userIds = [...new Set(rows.map((r) => String(r.user_id)))];
  const contentIds = [...new Set(rows.map((r) => r.recommended_content_id).filter(Boolean))] as string[];

  const [profilesResult, careerProfilesResult, contentsResult] = await Promise.all([
    client.from("profiles").select("id,name").in("id", userIds),
    client
      .from("career_profiles")
      .select("user_id,age_group,preferred_region,desired_start_timing")
      .in("user_id", userIds),
    contentIds.length > 0
      ? client.from("contents").select("id,title").in("id", contentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error) throwDataSourceError("LeadRepository.enrich.profiles", profilesResult.error);
  if (careerProfilesResult.error) throwDataSourceError("LeadRepository.enrich.careerProfiles", careerProfilesResult.error);
  if (contentsResult.error) throwDataSourceError("LeadRepository.enrich.contents", contentsResult.error);

  const nameByUserId = new Map((profilesResult.data ?? []).map((p) => [p.id, p.name as string | null]));
  const careerByUserId = new Map((careerProfilesResult.data ?? []).map((c) => [c.user_id, c]));
  const titleByContentId = new Map((contentsResult.data ?? []).map((c) => [c.id, c.title as string]));

  return rows.map((row) => {
    const career = careerByUserId.get(String(row.user_id)) as
      | { age_group?: string; preferred_region?: string; desired_start_timing?: string }
      | undefined;
    return {
      id: String(row.id),
      userId: String(row.user_id),
      name: nameByUserId.get(String(row.user_id)) ?? "회원",
      ageGroup: (career?.age_group as Lead["ageGroup"]) ?? undefined,
      region: (career?.preferred_region as Lead["region"]) ?? undefined,
      interestedJobLabel: (row.primary_interest as string | null) ?? undefined,
      desiredStartTiming: (career?.desired_start_timing as Lead["desiredStartTiming"]) ?? undefined,
      recentActionLabel: (row.recent_action_label as string | null) ?? "",
      recommendedContentTitle: row.recommended_content_id
        ? titleByContentId.get(row.recommended_content_id as string)
        : undefined,
      status: row.status as Lead["status"],
      score: {
        totalScore: Number(row.score ?? 0),
        grade: row.grade as LeadScoreBreakdown["grade"],
        signals: Object.entries((row.score_breakdown as Record<string, number> | null) ?? {}).map(
          ([key, points]) => ({ key, label: key, active: true, points }),
        ),
      },
      lastActivityAt: String(row.last_activity_at ?? row.created_at),
      createdAt: String(row.created_at),
    } satisfies Lead;
  });
}

export function createSupabaseLeadRepository(): LeadRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll(filter?: LeadFilter) {
      let query = client.from("leads").select("*").order("score", { ascending: false });
      if (filter?.grade) query = query.eq("grade", filter.grade);
      if (filter?.status) query = query.eq("status", filter.status);
      const result = await query;
      const rows = unwrapList("LeadRepository.findAll", result);
      return enrichLeads(client, rows as Record<string, unknown>[]);
    },
    async findById(id: string) {
      const result = await client.from("leads").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("LeadRepository.findById", result);
      if (!row) return null;
      const [lead] = await enrichLeads(client, [row as Record<string, unknown>]);
      return lead ?? null;
    },
    async create(input: LeadInput) {
      const { data, error } = await client
        .from("leads")
        .insert({
          user_id: input.userId,
          score: input.score?.totalScore ?? 0,
          grade: input.score?.grade ?? "D",
          status: input.status ?? "new",
          recent_action_label: input.recentActionLabel ?? "",
          primary_interest: input.interestedJobLabel ?? null,
          score_breakdown: input.score
            ? Object.fromEntries(input.score.signals.filter((s) => s.active).map((s) => [s.key, s.points]))
            : {},
          last_activity_at: input.lastActivityAt ?? new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("LeadRepository.create", error ?? new Error("no data returned"));
      const [lead] = await enrichLeads(client, [data as Record<string, unknown>]);
      return lead;
    },
    async update(id: string, input: Partial<LeadInput>) {
      const patch: Record<string, unknown> = {};
      if (input.status !== undefined) patch.status = input.status;
      if (input.recentActionLabel !== undefined) patch.recent_action_label = input.recentActionLabel;
      if (input.interestedJobLabel !== undefined) patch.primary_interest = input.interestedJobLabel;
      if (input.lastActivityAt !== undefined) patch.last_activity_at = input.lastActivityAt;
      if (input.score !== undefined) {
        patch.score = input.score.totalScore;
        patch.grade = input.score.grade;
        patch.score_breakdown = Object.fromEntries(
          input.score.signals.filter((s) => s.active).map((s) => [s.key, s.points]),
        );
      }
      const result = await client.from("leads").update(patch).eq("id", id).select("*").maybeSingle();
      const row = unwrapMaybe("LeadRepository.update", result);
      if (!row) return null;
      const [lead] = await enrichLeads(client, [row as Record<string, unknown>]);
      return lead ?? null;
    },
    async remove(id: string) {
      const { error } = await client.from("leads").delete().eq("id", id);
      if (error) throwDataSourceError("LeadRepository.remove", error);
      return true;
    },
  };
}
