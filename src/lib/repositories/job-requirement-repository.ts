import type { CrudRepository } from "./types";
import type { JobRequirement, JobRequirementInput, JobRequirementFilter } from "@/types";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseJobRequirementRepository } from "./supabase/job-requirement.supabase-repository";

/**
 * Job Requirement Repository.
 *
 * findByJobIds/replaceForJob은 시장 통계 Engine(Batch 재분석)에서 사용하는 대량 처리용 메서드다.
 * V1에서는 job 수가 많지 않아 애플리케이션 레이어에서 집계하지만, 인터페이스를 분리해두어
 * 향후 SQL 집계(RPC/View)로 교체해도 호출부를 바꾸지 않아도 되게 한다 (스펙 53번 성능 고려).
 */
export interface JobRequirementRepository extends CrudRepository<JobRequirement, JobRequirementInput, JobRequirementFilter> {
  findByJobIds(jobIds: string[]): Promise<JobRequirement[]>;
  /** 특정 Job의 기존 Requirement를 전부 지우고 새로 추출한 목록으로 교체한다 (재분류/재추출용). */
  replaceForJob(jobId: string, items: JobRequirementInput[]): Promise<JobRequirement[]>;
}

function buildEntity(input: JobRequirementInput, id: string): JobRequirement {
  return {
    id,
    jobId: input.jobId,
    requirementId: input.requirementId,
    requirementLevel: input.requirementLevel,
    sourceText: input.sourceText,
    confidence: input.confidence,
    createdAt: new Date().toISOString(),
  };
}

function createMockJobRequirementRepository(): JobRequirementRepository {
  let items: JobRequirement[] = [];
  let seq = 0;

  return {
    async findAll(filter) {
      if (!filter) return [...items];
      return items.filter(
        (item) =>
          (!filter.jobId || item.jobId === filter.jobId) &&
          (!filter.requirementId || item.requirementId === filter.requirementId),
      );
    },
    async findById(id) {
      return items.find((item) => item.id === id) ?? null;
    },
    async create(input) {
      seq += 1;
      const entity = buildEntity(input, `job-req-${Date.now()}-${seq}`);
      items = [...items.filter((i) => !(i.jobId === entity.jobId && i.requirementId === entity.requirementId)), entity];
      return entity;
    },
    async update(id, input) {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return null;
      const updated = { ...items[index], ...input };
      items = items.map((item, i) => (i === index ? updated : item));
      return updated;
    },
    async remove(id) {
      const existed = items.some((item) => item.id === id);
      items = items.filter((item) => item.id !== id);
      return existed;
    },
    async findByJobIds(jobIds) {
      const set = new Set(jobIds);
      return items.filter((item) => set.has(item.jobId));
    },
    async replaceForJob(jobId, newItems) {
      items = items.filter((item) => item.jobId !== jobId);
      const created = newItems.map((input) => {
        seq += 1;
        return buildEntity(input, `job-req-${Date.now()}-${seq}`);
      });
      items = [...items, ...created];
      return created;
    },
  };
}

let repository: JobRequirementRepository | null = null;

export function getJobRequirementRepository(): JobRequirementRepository {
  if (!repository) {
    repository = resolveRepository("JobRequirementRepository", {
      mock: createMockJobRequirementRepository,
      supabase: createSupabaseJobRequirementRepository,
    });
  }
  return repository;
}
