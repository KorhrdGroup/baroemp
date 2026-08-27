import type { SupportProgramRule, SupportProgramRuleInput } from "@/types";
import type { SupportProgramRuleRepository } from "../support-program-rule-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList } from "./query-helpers";

function mapRow(row: Record<string, unknown>): SupportProgramRule {
  return {
    id: String(row.id),
    supportProgramId: String(row.support_program_id),
    field: String(row.field) as SupportProgramRule["field"],
    operator: String(row.operator) as SupportProgramRule["operator"],
    value: row.value,
    weight: Number(row.weight ?? 10),
    isRequired: Boolean(row.is_required),
    ruleType: (row.rule_type as SupportProgramRule["ruleType"]) ?? "structured",
    status: (row.status as SupportProgramRule["status"]) ?? "active",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function createSupabaseSupportProgramRuleRepository(): SupportProgramRuleRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findByProgramId(supportProgramId) {
      const result = await client
        .from("support_program_rules")
        .select("*")
        .eq("support_program_id", supportProgramId)
        .eq("status", "active");
      const rows = unwrapList("SupportProgramRuleRepository.findByProgramId", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async findByProgramIds(supportProgramIds) {
      if (supportProgramIds.length === 0) return [];
      const BATCH = 50;
      const allRows: SupportProgramRule[] = [];
      for (let i = 0; i < supportProgramIds.length; i += BATCH) {
        const batch = supportProgramIds.slice(i, i + BATCH);
        const result = await client
          .from("support_program_rules")
          .select("*")
          .in("support_program_id", batch)
          .eq("status", "active");
        const rows = unwrapList("SupportProgramRuleRepository.findByProgramIds", result);
        allRows.push(...rows.map((row) => mapRow(row as Record<string, unknown>)));
      }
      return allRows;
    },
    async replaceForProgram(supportProgramId, rules) {
      const { error: deleteError } = await client
        .from("support_program_rules")
        .delete()
        .eq("support_program_id", supportProgramId);
      if (deleteError) throwDataSourceError("SupportProgramRuleRepository.replaceForProgram.delete", deleteError);

      if (rules.length === 0) return [];

      const now = new Date().toISOString();
      const rows = rules.map((rule: SupportProgramRuleInput) => ({
        support_program_id: supportProgramId,
        field: rule.field,
        operator: rule.operator,
        value: rule.value ?? null,
        weight: rule.weight ?? 10,
        is_required: rule.isRequired ?? false,
        rule_type: rule.ruleType ?? "structured",
        status: rule.status ?? "active",
        created_at: now,
        updated_at: now,
      }));

      const { data, error } = await client.from("support_program_rules").insert(rows).select("*");
      if (error) throwDataSourceError("SupportProgramRuleRepository.replaceForProgram.insert", error);
      return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
    },
  };
}
