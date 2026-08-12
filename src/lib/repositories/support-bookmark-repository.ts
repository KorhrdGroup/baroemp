import type { SupportBookmark } from "@/types";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseSupportBookmarkRepository } from "./supabase/support-bookmark.supabase-repository";

/**
 * Support Bookmark Repository.
 * job-bookmark-repository.ts와 동일한 철학: 비회원은 localStorage를 사용하고,
 * 로그인/가입 시 mergeSupportIds()로 병합한다.
 */
export interface SupportBookmarkRepository {
  findAllByUser(userId: string): Promise<SupportBookmark[]>;
  isBookmarked(userId: string, supportProgramId: string): Promise<boolean>;
  add(userId: string, supportProgramId: string): Promise<SupportBookmark>;
  remove(userId: string, supportProgramId: string): Promise<boolean>;
  mergeSupportIds(userId: string, supportProgramIds: string[]): Promise<number>;
}

function createMockSupportBookmarkRepository(): SupportBookmarkRepository {
  const store: SupportBookmark[] = [];
  return {
    async findAllByUser(userId) {
      return store.filter((b) => b.userId === userId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
    async isBookmarked(userId, supportProgramId) {
      return store.some((b) => b.userId === userId && b.supportProgramId === supportProgramId);
    },
    async add(userId, supportProgramId) {
      const existing = store.find((b) => b.userId === userId && b.supportProgramId === supportProgramId);
      if (existing) return existing;
      const created: SupportBookmark = {
        id: `support-bookmark-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId,
        supportProgramId,
        createdAt: new Date().toISOString(),
      };
      store.unshift(created);
      return created;
    },
    async remove(userId, supportProgramId) {
      const before = store.length;
      const remaining = store.filter((b) => !(b.userId === userId && b.supportProgramId === supportProgramId));
      store.length = 0;
      store.push(...remaining);
      return remaining.length < before;
    },
    async mergeSupportIds(userId, supportProgramIds) {
      let added = 0;
      for (const supportProgramId of supportProgramIds) {
        const existing = store.find((b) => b.userId === userId && b.supportProgramId === supportProgramId);
        if (!existing) {
          store.unshift({
            id: `support-bookmark-${Date.now()}-${Math.floor(Math.random() * 1000)}-${added}`,
            userId,
            supportProgramId,
            createdAt: new Date().toISOString(),
          });
          added++;
        }
      }
      return added;
    },
  };
}

let repository: SupportBookmarkRepository | null = null;

export function getSupportBookmarkRepository(): SupportBookmarkRepository {
  if (!repository) {
    repository = resolveRepository("SupportBookmarkRepository", {
      mock: createMockSupportBookmarkRepository,
      supabase: createSupabaseSupportBookmarkRepository,
    });
  }
  return repository;
}
