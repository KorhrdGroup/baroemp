import type { ExperienceBankItem, ExperienceBankItemInput } from "@/types";
import { getExperienceBankRepository } from "@/lib/repositories";
import { logActivityEvent } from "@/lib/activity/event-logger";

export async function listExperienceBankForUser(userId: string): Promise<ExperienceBankItem[]> {
  const items = await getExperienceBankRepository().findAll({ userId });
  return [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function createExperienceBankItem(userId: string, input: ExperienceBankItemInput): Promise<ExperienceBankItem> {
  const created = await getExperienceBankRepository().create({ ...input, userId });
  await logActivityEvent({
    userId,
    eventType: "profile_updated",
    entityType: "experience_bank",
    entityId: created.id,
    metadata: { action: "created" },
  });
  return created;
}

export async function updateExperienceBankItem(
  id: string,
  input: Partial<ExperienceBankItemInput>,
): Promise<ExperienceBankItem | null> {
  return getExperienceBankRepository().update(id, input);
}

export async function deleteExperienceBankItem(id: string): Promise<boolean> {
  return getExperienceBankRepository().remove(id);
}
