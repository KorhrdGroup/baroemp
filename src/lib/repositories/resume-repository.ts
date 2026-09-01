import type { CrudRepository } from "./types";
import type { Resume, ResumeInput } from "@/types";
import { mockResumes } from "@/mocks/resumes.mock";
import { InMemoryRepository } from "./mock/base.mock-repository";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseResumeRepository } from "./supabase/resume.supabase-repository";

export type ResumeFilter = { userId?: string };
export type ResumeRepository = CrudRepository<Resume, ResumeInput, ResumeFilter> & {
  /**
   * 대표 이력서를 지정한 하나로 바꾼다.
   * 대표는 회원당 하나뿐(resumes 의 부분 unique index)이라, 기존 대표를 먼저 내리고 나서 올린다.
   */
  setPrimary(userId: string, resumeId: string): Promise<void>;
};

function createMockResumeRepository(): ResumeRepository {
  const base = new InMemoryRepository<Resume, ResumeInput, ResumeFilter>({
    initialData: mockResumes,
    idPrefix: "resume",
    applyFilter: (item, filter) => !filter.userId || item.userId === filter.userId,
    buildEntity: (input, id) => {
      const now = new Date().toISOString();
      return {
        id,
        userId: input.userId,
        title: input.title,
        templateId: input.templateId,
        targetJobId: input.targetJobId,
        targetOccupationId: input.targetOccupationId,
        summary: input.summary,
        desiredJobTitle: input.desiredJobTitle,
        desiredRegion: input.desiredRegion,
        status: input.status ?? "draft",
        sectionCodes: input.sectionCodes ?? [],
        isPrimary: input.isPrimary ?? false,
        version: input.version ?? 1,
        completeness: 0,
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        birthDate: input.birthDate,
        photoUrl: input.photoUrl,
        portfolioUrl: input.portfolioUrl,
        createdAt: now,
        updatedAt: now,
      } satisfies Resume;
    },
    applyUpdate: (item, input) => ({ ...item, ...input, updatedAt: new Date().toISOString() }),
  });

  return {
    findAll: (filter) => base.findAll(filter),
    findById: (id) => base.findById(id),
    create: (input) => base.create(input),
    update: (id, input) => base.update(id, input),
    remove: (id) => base.remove(id),
    async setPrimary(userId, resumeId) {
      const all = await base.findAll({ userId });
      for (const r of all) {
        if (r.id !== resumeId && r.isPrimary) {
          await base.update(r.id, { isPrimary: false } as Partial<ResumeInput>);
        }
      }
      await base.update(resumeId, { isPrimary: true } as Partial<ResumeInput>);
    },
  };
}

let repository: ResumeRepository | null = null;

export function getResumeRepository(): ResumeRepository {
  if (!repository) {
    repository = resolveRepository("ResumeRepository", {
      mock: createMockResumeRepository,
      supabase: createSupabaseResumeRepository,
    });
  }
  return repository;
}
