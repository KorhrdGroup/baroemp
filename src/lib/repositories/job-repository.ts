import type { CrudRepository } from "./types";
import type { Job, JobInput, JobSearchFilter, JobSearchResult } from "@/types";
import { mockJobs } from "@/mocks/jobs.mock";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseJobRepository } from "./supabase/job.supabase-repository";

/**
 * Job Repository.
 *
 * 기본 CrudRepository 외에, 채용공고 특유의 요구사항을 추가로 지원한다:
 * - search(): 서버사이드 검색/필터/정렬/페이지네이션 (대량 공고를 고려해 findAll과 분리)
 * - findByExternalId / upsertExternal: 외부 Provider 동기화(중복 방지 upsert)
 * - deactivateStale: Provider에서 더 이상 보이지 않는 공고를 삭제 대신 비활성화
 */
export interface JobRepository extends CrudRepository<Job, JobInput, JobSearchFilter> {
  search(filter: JobSearchFilter): Promise<JobSearchResult>;
  findByExternalId(externalSource: string, externalId: string): Promise<Job | null>;
  upsertExternal(input: JobInput & { externalSource: string; externalId: string }): Promise<{ job: Job; isNew: boolean }>;
  /**
   * 여러 공고를 한 번에 upsert한다 (전량 동기화 6만+건을 서버리스 시간 한도 안에 처리하기 위한 배치 경로).
   * 배치 실패 시 구현체가 건별 upsert로 폴백해 한 건의 오류가 페이지 전체를 잃게 하지 않는다.
   */
  upsertExternalMany(
    inputs: (JobInput & { externalSource: string; externalId: string })[],
  ): Promise<{ newCount: number; updatedCount: number; errorCount: number }>;
  /** externalSource 기준으로, fetchedAt이 이 시각보다 이전인(=이번 sync에서 다시 보이지 않은) 공고를 비활성화한다. */
  deactivateStale(externalSource: string, fetchedBefore: string): Promise<number>;
}

function matchesFilter(job: Job, filter: JobSearchFilter): boolean {
  if (filter.activeOnly !== false && !job.isActive) return false;
  if (filter.jobCategory && job.jobCategory !== filter.jobCategory) return false;
  if (filter.occupationCode && job.occupationCode !== filter.occupationCode) return false;
  if (filter.employmentDestinationId && job.employmentDestinationId !== filter.employmentDestinationId) return false;
  if (filter.region && job.region !== filter.region) return false;
  if (filter.regionSigungu && job.regionSigungu !== filter.regionSigungu) return false;
  if (filter.workType && job.workType !== filter.workType) return false;
  if (filter.employmentTypeCode && job.employmentTypeCode !== filter.employmentTypeCode) return false;
  if (filter.careerRequirement && job.careerRequirement !== filter.careerRequirement) return false;
  if (filter.isBeginnerFriendly !== undefined && job.isBeginnerFriendly !== filter.isBeginnerFriendly) return false;
  if (filter.salaryMin !== undefined && (job.salaryMax ?? job.salaryMin ?? 0) < filter.salaryMin) return false;
  if (filter.salaryMax !== undefined && (job.salaryMin ?? job.salaryMax ?? Infinity) > filter.salaryMax) return false;
  if (filter.closingWithinDays !== undefined) {
    if (!job.applyDeadline) return false;
    const daysLeft = (new Date(job.applyDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft < 0 || daysLeft > filter.closingWithinDays) return false;
  }
  if (filter.preferentialCodes && filter.preferentialCodes.length > 0) {
    const hasAny = filter.preferentialCodes.some((code) => job.preferentialCodes?.includes(code));
    if (!hasAny) return false;
  }
  if (filter.tags && filter.tags.length > 0) {
    const hasAnyTag = filter.tags.some((tag) => job.tags.includes(tag));
    if (!hasAnyTag) return false;
  }
  if (filter.keyword) {
    const keyword = filter.keyword.trim().toLowerCase();
    const haystack = `${job.title} ${job.companyName} ${job.description} ${job.tags.join(" ")}`.toLowerCase();
    if (keyword && !haystack.includes(keyword)) return false;
  }
  return true;
}

function sortJobs(jobs: Job[], sort: JobSearchFilter["sort"]): Job[] {
  const list = [...jobs];
  switch (sort) {
    case "deadline":
      return list.sort((a, b) => {
        if (!a.applyDeadline) return 1;
        if (!b.applyDeadline) return -1;
        return a.applyDeadline < b.applyDeadline ? -1 : 1;
      });
    case "salary_desc":
      return list.sort((a, b) => (b.salaryMax ?? b.salaryMin ?? 0) - (a.salaryMax ?? a.salaryMin ?? 0));
    case "latest":
      return list.sort((a, b) => ((a.postedAt ?? a.createdAt) < (b.postedAt ?? b.createdAt) ? 1 : -1));
    case "recommended":
    default:
      return list.sort((a, b) => (b.midlifeRecommendationScore ?? 0) - (a.midlifeRecommendationScore ?? 0));
  }
}

function buildJobEntity(input: JobInput, id: string): Job {
  const now = new Date().toISOString();
  return {
    ...input,
    id,
    title: input.title ?? "제목 없음",
    companyName: input.companyName ?? "미입력",
    jobCategory: input.jobCategory ?? "other",
    region: input.region ?? "seoul",
    workType: input.workType ?? "full_time",
    isBeginnerFriendly: input.isBeginnerFriendly ?? false,
    preferredQualifications: input.preferredQualifications ?? [],
    tags: input.tags ?? [],
    description: input.description ?? "",
    status: input.status ?? "draft",
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  } satisfies Job;
}

function createMockJobRepository(): JobRepository {
  let items: Job[] = [...mockJobs];
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
      const entity = buildJobEntity(input, `job-${Date.now()}-${seq}`);
      items = [entity, ...items];
      return entity;
    },
    async update(id, input) {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return null;
      const updated: Job = { ...items[index], ...input, updatedAt: new Date().toISOString() };
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
      const filtered = sortJobs(
        items.filter((item) => matchesFilter(item, filter)),
        filter.sort,
      );
      const start = (page - 1) * pageSize;
      return {
        items: filtered.slice(start, start + pageSize),
        total: filtered.length,
        page,
        pageSize,
      };
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
        const updated: Job = { ...existing, ...input, updatedAt: now };
        items = items.map((item) => (item.id === existing.id ? updated : item));
        return { job: updated, isNew: false };
      }
      seq += 1;
      const created = buildJobEntity(input, `job-ext-${Date.now()}-${seq}`);
      items = [created, ...items];
      return { job: created, isNew: true };
    },
    async upsertExternalMany(inputs) {
      let newCount = 0;
      let updatedCount = 0;
      for (const input of inputs) {
        const { isNew } = await this.upsertExternal(input);
        if (isNew) newCount += 1;
        else updatedCount += 1;
      }
      return { newCount, updatedCount, errorCount: 0 };
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

let repository: JobRepository | null = null;

export function getJobRepository(): JobRepository {
  if (!repository) {
    repository = resolveRepository("JobRepository", {
      mock: createMockJobRepository,
      supabase: createSupabaseJobRepository,
    });
  }
  return repository;
}
