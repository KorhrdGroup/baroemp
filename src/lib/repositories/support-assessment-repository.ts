import type { SupportAssessmentAnswers, SupportAssessmentSession, SupportAssessmentSessionStatus } from "@/types";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseSupportAssessmentRepository } from "./supabase/support-assessment.supabase-repository";

export interface SupportAssessmentSessionCreateInput {
  userId?: string;
  anonymousId?: string;
  answers?: SupportAssessmentAnswers;
}

export interface SupportAssessmentSessionFilter {
  userId?: string;
  anonymousId?: string;
  status?: SupportAssessmentSessionStatus;
}

export interface SupportAssessmentSessionRepository {
  create(input: SupportAssessmentSessionCreateInput): Promise<SupportAssessmentSession>;
  findById(id: string): Promise<SupportAssessmentSession | null>;
  findAll(filter?: SupportAssessmentSessionFilter): Promise<SupportAssessmentSession[]>;
  update(id: string, patch: Partial<SupportAssessmentSession>): Promise<SupportAssessmentSession | null>;
  linkAnonymousToUser(anonymousId: string, userId: string): Promise<number>;
}

function createMockSupportAssessmentSessionRepository(): SupportAssessmentSessionRepository {
  const store: SupportAssessmentSession[] = [];
  return {
    async create(input) {
      const now = new Date().toISOString();
      const session: SupportAssessmentSession = {
        id: `supportsession-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: input.userId,
        anonymousId: input.anonymousId,
        status: "in_progress",
        answers: input.answers ?? {},
        startedAt: now,
        updatedAt: now,
      };
      store.unshift(session);
      return session;
    },
    async findById(id) {
      return store.find((s) => s.id === id) ?? null;
    },
    async findAll(filter) {
      return store.filter((s) => {
        if (filter?.userId && s.userId !== filter.userId) return false;
        if (filter?.anonymousId && s.anonymousId !== filter.anonymousId) return false;
        if (filter?.status && s.status !== filter.status) return false;
        return true;
      });
    },
    async update(id, patch) {
      const idx = store.findIndex((s) => s.id === id);
      if (idx === -1) return null;
      const updated: SupportAssessmentSession = { ...store[idx], ...patch, updatedAt: new Date().toISOString() };
      store[idx] = updated;
      return updated;
    },
    async linkAnonymousToUser(anonymousId, userId) {
      let count = 0;
      for (let i = 0; i < store.length; i++) {
        if (store[i].anonymousId === anonymousId) {
          store[i] = { ...store[i], userId, anonymousId: undefined };
          count++;
        }
      }
      return count;
    },
  };
}

let repository: SupportAssessmentSessionRepository | null = null;

export function getSupportAssessmentSessionRepository(): SupportAssessmentSessionRepository {
  if (!repository) {
    repository = resolveRepository("SupportAssessmentSessionRepository", {
      mock: createMockSupportAssessmentSessionRepository,
      supabase: createSupabaseSupportAssessmentRepository,
    });
  }
  return repository;
}
