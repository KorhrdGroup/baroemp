import type { CrudRepository } from "./types";
import type {
  Assessment,
  AssessmentAnswerInput,
  AssessmentAnswerRecord,
  AssessmentResult,
  AssessmentResultInput,
  AssessmentSession,
  AssessmentSessionStatus,
} from "@/types";
import { mockAssessments } from "@/mocks/assessments.mock";
import { mockAssessmentResultsSeed, mockAssessmentSessionsSeed } from "@/mocks/assessment-sessions.mock";
import { InMemoryRepository } from "./mock/base.mock-repository";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseAssessmentRepository } from "./supabase/assessment.supabase-repository";
import { createSupabaseAssessmentSessionRepository } from "./supabase/assessment-session.supabase-repository";
import { createSupabaseAssessmentAnswerRepository } from "./supabase/assessment-answer.supabase-repository";
import { createSupabaseAssessmentResultRepository } from "./supabase/assessment-result.supabase-repository";

export type AssessmentInput = Partial<Omit<Assessment, "id" | "createdAt" | "updatedAt">> & {
  title: string;
  type: Assessment["type"];
};

export type AssessmentRepository = CrudRepository<Assessment, AssessmentInput>;

function createMockAssessmentRepository(): AssessmentRepository {
  return new InMemoryRepository<Assessment, AssessmentInput>({
    initialData: mockAssessments,
    idPrefix: "assessment",
    buildEntity: (input, id) => {
      const now = new Date().toISOString();
      return {
        ...input,
        id,
        title: input.title,
        type: input.type,
        description: input.description ?? "",
        estimatedMinutes: input.estimatedMinutes ?? 5,
        sections: input.sections ?? [],
        questions: input.questions ?? [],
        tags: input.tags ?? [],
        isActive: input.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      } satisfies Assessment;
    },
    applyUpdate: (item, input) => ({ ...item, ...input, updatedAt: new Date().toISOString() }),
  });
}

let assessmentRepository: AssessmentRepository | null = null;

export function getAssessmentRepository(): AssessmentRepository {
  if (!assessmentRepository) {
    assessmentRepository = resolveRepository("AssessmentRepository", {
      mock: createMockAssessmentRepository,
      supabase: createSupabaseAssessmentRepository,
    });
  }
  return assessmentRepository;
}

/* ------------------------------------------------------------------------ */
/* Assessment Session                                                       */
/* ------------------------------------------------------------------------ */

export interface AssessmentSessionCreateInput {
  assessmentId: string;
  userId?: string;
  anonymousId?: string;
  totalSteps: number;
  currentSection: string;
}

export interface AssessmentSessionFilter {
  userId?: string;
  anonymousId?: string;
  assessmentId?: string;
  status?: AssessmentSessionStatus;
}

export interface AssessmentSessionRepository {
  create(input: AssessmentSessionCreateInput): Promise<AssessmentSession>;
  findById(id: string): Promise<AssessmentSession | null>;
  findAll(filter?: AssessmentSessionFilter): Promise<AssessmentSession[]>;
  update(id: string, patch: Partial<AssessmentSession>): Promise<AssessmentSession | null>;
  /** 비회원 세션을 회원에게 귀속시킨다. 반환값은 변경된 세션 수. */
  linkAnonymousToUser(anonymousId: string, userId: string): Promise<number>;
}

function createMockAssessmentSessionRepository(): AssessmentSessionRepository {
  const store: AssessmentSession[] = [...mockAssessmentSessionsSeed];
  return {
    async create(input) {
      const now = new Date().toISOString();
      const session: AssessmentSession = {
        id: `asession-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        assessmentId: input.assessmentId,
        userId: input.userId,
        anonymousId: input.anonymousId,
        status: "started",
        currentSection: input.currentSection,
        currentStep: 0,
        totalSteps: input.totalSteps,
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
        if (filter?.assessmentId && s.assessmentId !== filter.assessmentId) return false;
        if (filter?.status && s.status !== filter.status) return false;
        return true;
      });
    },
    async update(id, patch) {
      const idx = store.findIndex((s) => s.id === id);
      if (idx === -1) return null;
      const updated: AssessmentSession = { ...store[idx], ...patch, updatedAt: new Date().toISOString() };
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

let sessionRepository: AssessmentSessionRepository | null = null;

export function getAssessmentSessionRepository(): AssessmentSessionRepository {
  if (!sessionRepository) {
    sessionRepository = resolveRepository("AssessmentSessionRepository", {
      mock: createMockAssessmentSessionRepository,
      supabase: createSupabaseAssessmentSessionRepository,
    });
  }
  return sessionRepository;
}

/* ------------------------------------------------------------------------ */
/* Assessment Answer                                                        */
/* ------------------------------------------------------------------------ */

export interface AssessmentAnswerRepository {
  upsert(input: AssessmentAnswerInput): Promise<AssessmentAnswerRecord>;
  findBySession(sessionId: string): Promise<AssessmentAnswerRecord[]>;
}

function createMockAssessmentAnswerRepository(): AssessmentAnswerRepository {
  const answerStore: AssessmentAnswerRecord[] = [];
  return {
    async upsert(input) {
      const existingIndex = answerStore.findIndex(
        (a) => a.sessionId === input.sessionId && a.questionId === input.questionId,
      );
      const record: AssessmentAnswerRecord = {
        ...input,
        id:
          existingIndex >= 0
            ? answerStore[existingIndex].id
            : `aanswer-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        answeredAt: new Date().toISOString(),
      };
      if (existingIndex >= 0) {
        answerStore[existingIndex] = record;
      } else {
        answerStore.push(record);
      }
      return record;
    },
    async findBySession(sessionId) {
      return answerStore.filter((a) => a.sessionId === sessionId);
    },
  };
}

let answerRepository: AssessmentAnswerRepository | null = null;

export function getAssessmentAnswerRepository(): AssessmentAnswerRepository {
  if (!answerRepository) {
    answerRepository = resolveRepository("AssessmentAnswerRepository", {
      mock: createMockAssessmentAnswerRepository,
      supabase: createSupabaseAssessmentAnswerRepository,
    });
  }
  return answerRepository;
}

/* ------------------------------------------------------------------------ */
/* Assessment Result                                                        */
/* ------------------------------------------------------------------------ */

export interface AssessmentResultFilter {
  userId?: string;
  anonymousId?: string;
  assessmentId?: string;
  sessionId?: string;
}

export interface AssessmentResultRepository {
  findAll(filter?: AssessmentResultFilter): Promise<AssessmentResult[]>;
  findById(id: string): Promise<AssessmentResult | null>;
  findBySessionId(sessionId: string): Promise<AssessmentResult | null>;
  create(input: AssessmentResultInput): Promise<AssessmentResult>;
  linkAnonymousToUser(anonymousId: string, userId: string): Promise<number>;
}

function createMockAssessmentResultRepository(): AssessmentResultRepository {
  const store: AssessmentResult[] = [...mockAssessmentResultsSeed];
  return {
    async findAll(filter) {
      return store.filter((result) => {
        if (filter?.userId && result.userId !== filter.userId) return false;
        if (filter?.anonymousId && result.anonymousId !== filter.anonymousId) return false;
        if (filter?.assessmentId && result.assessmentId !== filter.assessmentId) return false;
        if (filter?.sessionId && result.sessionId !== filter.sessionId) return false;
        return true;
      });
    },
    async findById(id) {
      return store.find((r) => r.id === id) ?? null;
    },
    async findBySessionId(sessionId) {
      return store.find((r) => r.sessionId === sessionId) ?? null;
    },
    async create(input) {
      const result: AssessmentResult = {
        ...input,
        id: `aresult-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        completedAt: new Date().toISOString(),
      };
      store.unshift(result);
      return result;
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

let resultRepository: AssessmentResultRepository | null = null;

export function getAssessmentResultRepository(): AssessmentResultRepository {
  if (!resultRepository) {
    resultRepository = resolveRepository("AssessmentResultRepository", {
      mock: createMockAssessmentResultRepository,
      supabase: createSupabaseAssessmentResultRepository,
    });
  }
  return resultRepository;
}
