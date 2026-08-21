"use server";

import type { ExperienceBankItem, ExperienceBankItemInput } from "@/types";
import { requireSessionUser } from "@/lib/auth/session";
import { getExperienceBankRepository } from "@/lib/repositories";
import {
  createExperienceBankItem,
  deleteExperienceBankItem,
  updateExperienceBankItem,
} from "@/services/experience-bank.service";

export async function createExperienceBankItemAction(input: ExperienceBankItemInput): Promise<ExperienceBankItem> {
  const user = await requireSessionUser();
  return createExperienceBankItem(user.id, input);
}

export async function updateExperienceBankItemAction(
  id: string,
  input: Partial<ExperienceBankItemInput>,
): Promise<ExperienceBankItem | null> {
  const user = await requireSessionUser();
  const existing = await getExperienceBankRepository().findById(id);
  if (!existing || existing.userId !== user.id) throw new Error("본인의 경험만 수정할 수 있습니다.");
  return updateExperienceBankItem(id, input);
}

export async function deleteExperienceBankItemAction(id: string): Promise<boolean> {
  const user = await requireSessionUser();
  const existing = await getExperienceBankRepository().findById(id);
  if (!existing || existing.userId !== user.id) throw new Error("본인의 경험만 삭제할 수 있습니다.");
  return deleteExperienceBankItem(id);
}
