import type { JobBookmark } from "@/types";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseJobBookmarkRepository } from "./supabase/job-bookmark.supabase-repository";

/**
 * Job Bookmark Repository.
 *
 * 비회원은 이 Repository를 사용하지 않는다 (localStorage에 jobId 배열로 임시 저장).
 * 회원가입/로그인 시 로컬 저장된 jobId들을 이 Repository의 add()로 병합한다.
 */
export interface JobBookmarkRepository {
  findAllByUser(userId: string): Promise<JobBookmark[]>;
  isBookmarked(userId: string, jobId: string): Promise<boolean>;
  /** 이미 찜한 공고면 기존 레코드를 그대로 반환한다 (중복 찜 금지). */
  add(userId: string, jobId: string): Promise<JobBookmark>;
  remove(userId: string, jobId: string): Promise<boolean>;
  /** 로그인 직후 localStorage에 쌓여있던 jobId들을 한 번에 병합한다. 반환값은 새로 추가된 건수. */
  mergeJobIds(userId: string, jobIds: string[]): Promise<number>;
}

function createMockJobBookmarkRepository(): JobBookmarkRepository {
  const store: JobBookmark[] = [];
  return {
    async findAllByUser(userId) {
      return store.filter((b) => b.userId === userId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
    async isBookmarked(userId, jobId) {
      return store.some((b) => b.userId === userId && b.jobId === jobId);
    },
    async add(userId, jobId) {
      const existing = store.find((b) => b.userId === userId && b.jobId === jobId);
      if (existing) return existing;
      const created: JobBookmark = {
        id: `bookmark-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId,
        jobId,
        createdAt: new Date().toISOString(),
      };
      store.unshift(created);
      return created;
    },
    async remove(userId, jobId) {
      const before = store.length;
      const remaining = store.filter((b) => !(b.userId === userId && b.jobId === jobId));
      store.length = 0;
      store.push(...remaining);
      return remaining.length < before;
    },
    async mergeJobIds(userId, jobIds) {
      let added = 0;
      for (const jobId of jobIds) {
        const existing = store.find((b) => b.userId === userId && b.jobId === jobId);
        if (!existing) {
          store.unshift({
            id: `bookmark-${Date.now()}-${Math.floor(Math.random() * 1000)}-${added}`,
            userId,
            jobId,
            createdAt: new Date().toISOString(),
          });
          added++;
        }
      }
      return added;
    },
  };
}

let repository: JobBookmarkRepository | null = null;

export function getJobBookmarkRepository(): JobBookmarkRepository {
  if (!repository) {
    repository = resolveRepository("JobBookmarkRepository", {
      mock: createMockJobBookmarkRepository,
      supabase: createSupabaseJobBookmarkRepository,
    });
  }
  return repository;
}
