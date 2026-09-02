import type { JobApplication, JobApplicationStatus } from "@/types";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseJobApplicationRepository } from "./supabase/job-application.supabase-repository";

/**
 * Job Application Repository: 회원이 직접 표시한 지원·면접·취업 상태.
 * 공고 하나에 한 줄이라 add 대신 upsert 로 다룬다.
 */
export interface JobApplicationRepository {
  findAllByUser(userId: string): Promise<JobApplication[]>;
  /** 같은 공고에 이미 있으면 상태와 표시 시각만 바꾼다. */
  upsert(userId: string, jobId: string, status: JobApplicationStatus): Promise<JobApplication>;
  remove(userId: string, jobId: string): Promise<boolean>;
}

function createMockJobApplicationRepository(): JobApplicationRepository {
  const store: JobApplication[] = [];
  return {
    async findAllByUser(userId) {
      return store.filter((a) => a.userId === userId).sort((a, b) => (a.reportedAt < b.reportedAt ? 1 : -1));
    },
    async upsert(userId, jobId, status) {
      const now = new Date().toISOString();
      const existing = store.find((a) => a.userId === userId && a.jobId === jobId);
      if (existing) {
        existing.status = status;
        existing.reportedAt = now;
        existing.updatedAt = now;
        return existing;
      }
      const created: JobApplication = {
        id: `application-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId,
        jobId,
        status,
        reportedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      store.unshift(created);
      return created;
    },
    async remove(userId, jobId) {
      const before = store.length;
      const remaining = store.filter((a) => !(a.userId === userId && a.jobId === jobId));
      store.length = 0;
      store.push(...remaining);
      return remaining.length < before;
    },
  };
}

let repository: JobApplicationRepository | null = null;

export function getJobApplicationRepository(): JobApplicationRepository {
  if (!repository) {
    repository = resolveRepository("JobApplicationRepository", {
      mock: createMockJobApplicationRepository,
      supabase: createSupabaseJobApplicationRepository,
    });
  }
  return repository;
}
