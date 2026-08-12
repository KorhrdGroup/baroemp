import type { CrudRepository } from "./types";
import type { CareerContent, CareerContentInput, ContentType, PublishStatus } from "@/types";
import { mockContents } from "@/mocks/contents.mock";
import { InMemoryRepository } from "./mock/base.mock-repository";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseContentRepository } from "./supabase/content.supabase-repository";

export interface ContentFilter {
  type?: ContentType | (string & {});
  status?: PublishStatus | (string & {});
  tag?: string;
  keyword?: string;
}

export type ContentRepository = CrudRepository<CareerContent, CareerContentInput, ContentFilter>;

function matchesFilter(content: CareerContent, filter: ContentFilter): boolean {
  if (filter.type && content.type !== filter.type) return false;
  if (filter.status && content.status !== filter.status) return false;
  if (filter.tag && !content.tags.includes(filter.tag)) return false;
  if (filter.keyword) {
    const keyword = filter.keyword.trim().toLowerCase();
    const haystack = `${content.title} ${content.description}`.toLowerCase();
    if (keyword && !haystack.includes(keyword)) return false;
  }
  return true;
}

let repository: ContentRepository | null = null;

function createMockContentRepository(): ContentRepository {
  return new InMemoryRepository<CareerContent, CareerContentInput, ContentFilter>({
    initialData: mockContents,
    idPrefix: "content",
    applyFilter: matchesFilter,
    buildEntity: (input, id) => {
      const now = new Date().toISOString();
      return {
        ...input,
        id,
        title: input.title,
        type: input.type,
        description: input.description ?? "",
        tags: input.tags ?? [],
        relatedJobs: input.relatedJobs ?? [],
        targetAgeGroups: input.targetAgeGroups ?? [],
        targetConditions: input.targetConditions ?? [],
        requiredQualifications: input.requiredQualifications ?? [],
        recommendationRules: input.recommendationRules ?? {},
        price: input.price ?? 0,
        isPaid: input.isPaid ?? false,
        status: input.status ?? "draft",
        createdAt: now,
        updatedAt: now,
      } satisfies CareerContent;
    },
    applyUpdate: (item, input) => ({
      ...item,
      ...input,
      updatedAt: new Date().toISOString(),
    }),
  });
}

/**
 * Mock / Supabase 구현체 전환.
 * 정책은 resolveRepository (src/lib/data/resolve-repository.ts) 참고:
 * 개발환경은 Mock 폴백, 운영환경은 Supabase 클라이언트 생성 실패 시 DataSourceError.
 */
export function getContentRepository(): ContentRepository {
  if (!repository) {
    repository = resolveRepository("ContentRepository", {
      mock: createMockContentRepository,
      supabase: createSupabaseContentRepository,
    });
  }
  return repository;
}

/** 테스트/모드 전환 시 싱글턴 초기화 */
export function resetContentRepository(): void {
  repository = null;
}
