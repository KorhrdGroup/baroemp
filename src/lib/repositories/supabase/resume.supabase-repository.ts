import type { Resume, ResumeInput } from "@/types";
import type { ResumeRepository } from "../resume-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): Resume {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    templateId: (row.template_id as string | null) ?? undefined,
    title: String(row.title),
    targetJobId: (row.target_job_id as string | null) ?? undefined,
    targetOccupationId: (row.target_occupation_id as string | null) ?? undefined,
    summary: (row.summary as string | null) ?? undefined,
    desiredJobTitle: (row.desired_job_title as string | null) ?? undefined,
    desiredRegion: (row.desired_region as string | null) ?? undefined,
    status: (row.status as Resume["status"]) ?? "draft",
    sectionCodes: Array.isArray(row.section_codes) ? (row.section_codes as string[]) : [],
    isPrimary: Boolean(row.is_primary),
    version: Number(row.version ?? 1),
    completeness: Number(row.completeness ?? 0),
    name: (row.name as string | null) ?? undefined,
    email: (row.email as string | null) ?? undefined,
    phone: (row.phone as string | null) ?? undefined,
    address: (row.address as string | null) ?? undefined,
    birthDate: (row.birth_date as string | null) ?? undefined,
    photoUrl: (row.photo_url as string | null) ?? undefined,
    portfolioUrl: (row.portfolio_url as string | null) ?? undefined,
    hasNoWorkExperience: Boolean(row.has_no_work_experience),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toRow(input: Partial<ResumeInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.templateId !== undefined) row.template_id = input.templateId;
  if (input.targetJobId !== undefined) row.target_job_id = input.targetJobId;
  if (input.targetOccupationId !== undefined) row.target_occupation_id = input.targetOccupationId;
  if (input.summary !== undefined) row.summary = input.summary;
  if (input.desiredJobTitle !== undefined) row.desired_job_title = input.desiredJobTitle;
  if (input.desiredRegion !== undefined) row.desired_region = input.desiredRegion;
  if (input.status !== undefined) row.status = input.status;
  if (input.sectionCodes !== undefined) row.section_codes = input.sectionCodes;
  if (input.isPrimary !== undefined) row.is_primary = input.isPrimary;
  if (input.version !== undefined) row.version = input.version;
  if (input.name !== undefined) row.name = input.name;
  if (input.email !== undefined) row.email = input.email;
  if (input.phone !== undefined) row.phone = input.phone;
  if (input.address !== undefined) row.address = input.address;
  if (input.birthDate !== undefined) row.birth_date = input.birthDate || null;
  if (input.photoUrl !== undefined) row.photo_url = input.photoUrl || null;
  if (input.portfolioUrl !== undefined) row.portfolio_url = input.portfolioUrl;
  if (input.hasNoWorkExperience !== undefined) row.has_no_work_experience = input.hasNoWorkExperience;
  if (input.completeness !== undefined) row.completeness = input.completeness;
  return row;
}

export function createSupabaseResumeRepository(): ResumeRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll(filter) {
      let query = client.from("resumes").select("*");
      if (filter?.userId) query = query.eq("user_id", filter.userId);
      query = query.order("updated_at", { ascending: false });
      const result = await query;
      const rows = unwrapList("ResumeRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async findById(id) {
      const result = await client.from("resumes").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("ResumeRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async create(input) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("resumes")
        .insert({
          user_id: input.userId,
          ...toRow(input),
          status: input.status ?? "draft",
          is_primary: input.isPrimary ?? false,
          version: input.version ?? 1,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("ResumeRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async update(id, input) {
      const result = await client
        .from("resumes")
        .update({ ...toRow(input), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      const row = unwrapMaybe("ResumeRepository.update", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async remove(id) {
      const { error } = await client.from("resumes").delete().eq("id", id);
      if (error) throwDataSourceError("ResumeRepository.remove", error);
      return true;
    },
    async setPrimary(userId, resumeId) {
      /*
        대표는 회원당 하나만 허용하는 부분 unique index 가 걸려 있어, 올리기 전에 내려야 한다.

        여기서만 updated_at 을 보내지 않는다. 대표 지정은 이력서 내용을 고친 게 아니라서
        목록의 "최근수정"이 밀리면 안 된다 - is_primary 만 바뀐 update 는 트리거
        set_resumes_updated_at() 이 updated_at 을 그대로 두게 되어 있다.
      */
      const cleared = await client
        .from("resumes")
        .update({ is_primary: false })
        .eq("user_id", userId)
        .neq("id", resumeId)
        .eq("is_primary", true);
      if (cleared.error) throwDataSourceError("ResumeRepository.setPrimary", cleared.error);

      const { error } = await client
        .from("resumes")
        .update({ is_primary: true })
        .eq("id", resumeId)
        .eq("user_id", userId);
      if (error) throwDataSourceError("ResumeRepository.setPrimary", error);
    },
  };
}
