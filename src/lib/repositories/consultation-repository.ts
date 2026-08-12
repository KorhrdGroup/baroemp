import type { CrudRepository } from "./types";
import type { Consultation } from "@/types";
import { mockConsultations } from "@/mocks/consultations.mock";
import { InMemoryRepository } from "./mock/base.mock-repository";

export type ConsultationInput = Partial<Omit<Consultation, "id" | "createdAt" | "updatedAt">> & {
  userId: string;
  channel: Consultation["channel"];
};

export type ConsultationRepository = CrudRepository<Consultation, ConsultationInput, { userId?: string }>;

let repository: ConsultationRepository | null = null;

export function getConsultationRepository(): ConsultationRepository {
  if (!repository) {
    repository = new InMemoryRepository<Consultation, ConsultationInput, { userId?: string }>({
      initialData: mockConsultations,
      idPrefix: "consult",
      applyFilter: (item, filter) => !filter.userId || item.userId === filter.userId,
      buildEntity: (input, id) => {
        const now = new Date().toISOString();
        return {
          ...input,
          id,
          userId: input.userId,
          channel: input.channel,
          status: input.status ?? "requested",
          createdAt: now,
          updatedAt: now,
        } satisfies Consultation;
      },
      applyUpdate: (item, input) => ({ ...item, ...input, updatedAt: new Date().toISOString() }),
    });
  }
  return repository;
}
