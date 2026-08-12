import type { CrudRepository } from "./types";
import type { SupportProgram, SupportProgramInput, SupportSearchFilter, SupportSearchResult } from "@/types";
import { mockSupportPrograms } from "@/mocks/support-programs.mock";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseSupportProgramRepository } from "./supabase/support-program.supabase-repository";

/**
 * Support Program Repository.
 *
 * job-repository.ts와 동일한 철학: 기본 CrudRepository 외에
 * - search(): 서버사이드 검색/필터/정렬/페이지네이션
 * - findByExternalId / upsertExternal: 외부 Provider 동기화(중복 방지 upsert)
 * - deactivateStale: Provider에서 더 이상 보이지 않는 지원제도를 삭제 대신 비활성화
 * 를 추가로 지원한다.
 */
export interface SupportProgramRepository extends CrudRepository<SupportProgram, SupportProgramInput, SupportSearchFilter> {
  search(filter: SupportSearchFilter): Promise<SupportSearchResult>;
  findByExternalId(externalSource: string, externalId: string): Promise<SupportProgram | null>;
  upsertExternal(
    input: SupportProgramInput & { externalSource: string; externalId: string },
  ): Promise<{ program: SupportProgram; isNew: boolean }>;
  deactivateStale(externalSource: string, fetchedBefore: string): Promise<number>;
}

function matchesFilter(program: SupportProgram, filter: SupportSearchFilter): boolean {
  if (filter.activeOnly !== false && !program.isActive) return false;
  if (filter.minCareerRelevanceScore !== undefined && (program.careerRelevanceScore ?? 0) < filter.minCareerRelevanceScore) {
    return false;
  }
  if (filter.category && program.category !== filter.category) return false;
  if (filter.region && !(program.targetRegions?.includes(filter.region) ?? program.regionScope === filter.region)) {
    return false;
  }
  if (filter.regionScope && program.regionScope !== filter.regionScope) return false;
  if (filter.ageGroup && program.targetAgeGroups.length > 0 && !program.targetAgeGroups.includes(filter.ageGroup)) {
    return false;
  }
  if (
    filter.employmentStatus &&
    program.employmentStatusTargets &&
    program.employmentStatusTargets.length > 0 &&
    !program.employmentStatusTargets.includes(filter.employmentStatus)
  ) {
    return false;
  }
  if (filter.provider && program.externalSource !== filter.provider) return false;
  if (filter.status && program.status !== filter.status) return false;
  if (filter.tags && filter.tags.length > 0) {
    const hasAnyTag = filter.tags.some((tag) => program.tags.includes(tag));
    if (!hasAnyTag) return false;
  }
  if (filter.keyword) {
    const keyword = filter.keyword.trim().toLowerCase();
    const haystack = `${program.title} ${program.organization} ${program.summary} ${program.tags.join(" ")}`.toLowerCase();
    if (keyword && !haystack.includes(keyword)) return false;
  }
  return true;
}

function sortPrograms(programs: SupportProgram[], sort: SupportSearchFilter["sort"]): SupportProgram[] {
  const list = [...programs];
  switch (sort) {
    case "deadline":
      return list.sort((a, b) => {
        if (!a.applicationEndAt) return 1;
        if (!b.applicationEndAt) return -1;
        return a.applicationEndAt < b.applicationEndAt ? -1 : 1;
      });
    case "latest":
      return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    case "recommended":
    default:
      return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
}

function buildEntity(input: SupportProgramInput, id: string): SupportProgram {
  const now = new Date().toISOString();
  return {
    ...input,
    id,
    title: input.title,
    organization: input.organization,
    summary: input.summary ?? "",
    description: input.description ?? "",
    category: input.category ?? "other",
    supportType: input.supportType ?? "other",
    targetAgeGroups: input.targetAgeGroups ?? [],
    targetConditions: input.targetConditions ?? [],
    tags: input.tags ?? [],
    status: input.status ?? "draft",
    isActive: input.isActive ?? true,
    careerRelevanceScore: input.careerRelevanceScore ?? 0,
    careerRelevanceReasons: input.careerRelevanceReasons ?? [],
    createdAt: now,
    updatedAt: now,
  } satisfies SupportProgram;
}

function createMockSupportProgramRepository(): SupportProgramRepository {
  let items: SupportProgram[] = [...mockSupportPrograms];
  let seq = 0;

  return {
    async findAll(filter) {
      if (!filter) return [...items];
      return items.filter((item) => matchesFilter(item, { ...filter, activeOnly: filter.activeOnly ?? false }));
    },
    async findById(id) {
      return items.find((item) => item.id === id) ?? null;
    },
    async create(input) {
      seq += 1;
      const entity = buildEntity(input, `support-${Date.now()}-${seq}`);
      items = [entity, ...items];
      return entity;
    },
    async update(id, input) {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return null;
      const updated: SupportProgram = { ...items[index], ...input, updatedAt: new Date().toISOString() };
      items = items.map((item, i) => (i === index ? updated : item));
      return updated;
    },
    async remove(id) {
      const existed = items.some((item) => item.id === id);
      items = items.filter((item) => item.id !== id);
      return existed;
    },
    async search(filter) {
      const page = Math.max(1, filter.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
      const filtered = sortPrograms(
        items.filter((item) => matchesFilter(item, filter)),
        filter.sort,
      );
      const start = (page - 1) * pageSize;
      return { items: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize };
    },
    async findByExternalId(externalSource, externalId) {
      return items.find((item) => item.externalSource === externalSource && item.externalId === externalId) ?? null;
    },
    async upsertExternal(input) {
      const existing = items.find(
        (item) => item.externalSource === input.externalSource && item.externalId === input.externalId,
      );
      const now = new Date().toISOString();
      if (existing) {
        const updated: SupportProgram = { ...existing, ...input, updatedAt: now };
        items = items.map((item) => (item.id === existing.id ? updated : item));
        return { program: updated, isNew: false };
      }
      seq += 1;
      const created = buildEntity(input, `support-ext-${Date.now()}-${seq}`);
      items = [created, ...items];
      return { program: created, isNew: true };
    },
    async deactivateStale(externalSource, fetchedBefore) {
      let count = 0;
      items = items.map((item) => {
        if (
          item.externalSource === externalSource &&
          item.isActive &&
          (!item.fetchedAt || item.fetchedAt < fetchedBefore)
        ) {
          count += 1;
          return { ...item, isActive: false, closedAt: new Date().toISOString() };
        }
        return item;
      });
      return count;
    },
  };
}

let repository: SupportProgramRepository | null = null;

export function getSupportProgramRepository(): SupportProgramRepository {
  if (!repository) {
    repository = resolveRepository("SupportProgramRepository", {
      mock: createMockSupportProgramRepository,
      supabase: createSupabaseSupportProgramRepository,
    });
  }
  return repository;
}
