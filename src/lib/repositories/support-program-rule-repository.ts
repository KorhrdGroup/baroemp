import type { SupportProgramRule, SupportProgramRuleInput } from "@/types";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseSupportProgramRuleRepository } from "./supabase/support-program-rule.supabase-repository";

/**
 * Eligibility Rule Engine의 저장소.
 *
 * replaceForProgram()은 Support Sync Service가 Provider의 구조화 Rule 힌트를 반영할 때
 * "이번에 받은 Rule 목록으로 통째로 교체"하는 방식을 사용한다 (개별 diff 대신 단순함을 택함 —
 * Provider 재동기화 시 이전 Rule이 그대로 남아 불일치가 생기는 것을 방지한다).
 */
export interface SupportProgramRuleRepository {
  findByProgramId(supportProgramId: string): Promise<SupportProgramRule[]>;
  findByProgramIds(supportProgramIds: string[]): Promise<SupportProgramRule[]>;
  replaceForProgram(supportProgramId: string, rules: SupportProgramRuleInput[]): Promise<SupportProgramRule[]>;
}

function buildRule(input: SupportProgramRuleInput, id: string): SupportProgramRule {
  const now = new Date().toISOString();
  return {
    id,
    supportProgramId: input.supportProgramId,
    field: input.field,
    operator: input.operator,
    value: input.value ?? null,
    weight: input.weight ?? 10,
    isRequired: input.isRequired ?? false,
    ruleType: input.ruleType ?? "structured",
    status: input.status ?? "active",
    createdAt: now,
    updatedAt: now,
  };
}

function createMockSupportProgramRuleRepository(): SupportProgramRuleRepository {
  let items: SupportProgramRule[] = [];
  let seq = 0;

  return {
    async findByProgramId(supportProgramId) {
      return items.filter((r) => r.supportProgramId === supportProgramId && r.status === "active");
    },
    async findByProgramIds(supportProgramIds) {
      const idSet = new Set(supportProgramIds);
      return items.filter((r) => idSet.has(r.supportProgramId) && r.status === "active");
    },
    async replaceForProgram(supportProgramId, rules) {
      items = items.filter((r) => r.supportProgramId !== supportProgramId);
      const created = rules.map((rule) => {
        seq += 1;
        return buildRule({ ...rule, supportProgramId }, `support-rule-${Date.now()}-${seq}`);
      });
      items = [...items, ...created];
      return created;
    },
  };
}

let repository: SupportProgramRuleRepository | null = null;

export function getSupportProgramRuleRepository(): SupportProgramRuleRepository {
  if (!repository) {
    repository = resolveRepository("SupportProgramRuleRepository", {
      mock: createMockSupportProgramRuleRepository,
      supabase: createSupabaseSupportProgramRuleRepository,
    });
  }
  return repository;
}
