import type { CoverLetterSection, CoverLetterSectionInput } from "@/types";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseCoverLetterSectionRepository } from "./supabase/cover-letter-section.supabase-repository";

export interface CoverLetterSectionRepository {
  getSections(coverLetterId: string): Promise<CoverLetterSection[]>;
  replaceSections(coverLetterId: string, items: CoverLetterSectionInput[]): Promise<CoverLetterSection[]>;
}

function createMockCoverLetterSectionRepository(): CoverLetterSectionRepository {
  let store: CoverLetterSection[] = [];
  let seq = 0;
  return {
    async getSections(coverLetterId) {
      return store.filter((s) => s.coverLetterId === coverLetterId).sort((a, b) => a.orderIndex - b.orderIndex);
    },
    async replaceSections(coverLetterId, input) {
      const created = input.map((item, i) => ({
        id: `cl-section-${Date.now()}-${seq++}`,
        coverLetterId,
        questionType: item.questionType,
        question: item.question,
        content: item.content ?? "",
        characterLimit: item.characterLimit,
        orderIndex: item.orderIndex ?? i,
      }));
      store = [...store.filter((s) => s.coverLetterId !== coverLetterId), ...created];
      return created;
    },
  };
}

let repository: CoverLetterSectionRepository | null = null;

export function getCoverLetterSectionRepository(): CoverLetterSectionRepository {
  if (!repository) {
    repository = resolveRepository("CoverLetterSectionRepository", {
      mock: createMockCoverLetterSectionRepository,
      supabase: createSupabaseCoverLetterSectionRepository,
    });
  }
  return repository;
}
