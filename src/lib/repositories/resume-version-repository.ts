import type { ResumeChangeType, ResumeSnapshot, ResumeVersion } from "@/types";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseResumeVersionRepository } from "./supabase/resume-version.supabase-repository";

export interface ResumeVersionRepository {
  listByResume(resumeId: string): Promise<ResumeVersion[]>;
  create(input: { resumeId: string; version: number; snapshot: ResumeSnapshot; changeType: ResumeChangeType }): Promise<ResumeVersion>;
}

function createMockResumeVersionRepository(): ResumeVersionRepository {
  let store: ResumeVersion[] = [];
  let seq = 0;
  return {
    async listByResume(resumeId) {
      return store.filter((v) => v.resumeId === resumeId).sort((a, b) => b.version - a.version);
    },
    async create(input) {
      const created: ResumeVersion = {
        id: `resume-version-${Date.now()}-${seq++}`,
        resumeId: input.resumeId,
        version: input.version,
        snapshot: input.snapshot,
        changeType: input.changeType,
        createdAt: new Date().toISOString(),
      };
      store = [created, ...store];
      return created;
    },
  };
}

let repository: ResumeVersionRepository | null = null;

export function getResumeVersionRepository(): ResumeVersionRepository {
  if (!repository) {
    repository = resolveRepository("ResumeVersionRepository", {
      mock: createMockResumeVersionRepository,
      supabase: createSupabaseResumeVersionRepository,
    });
  }
  return repository;
}
