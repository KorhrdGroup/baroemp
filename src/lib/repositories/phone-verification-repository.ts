import type { PhoneVerification, PhoneVerificationCreateInput, PhoneVerificationPurpose } from "@/types";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabasePhoneVerificationRepository } from "./supabase/phone-verification.supabase-repository";

export interface PhoneVerificationRepository {
  create(input: PhoneVerificationCreateInput): Promise<PhoneVerification>;
  findById(id: string): Promise<PhoneVerification | null>;
  /** 아직 만료되지 않고 소비되지 않은 가장 최근 발급 1건 */
  findLatestActive(phone: string, purpose: PhoneVerificationPurpose): Promise<PhoneVerification | null>;
  /** since 이후 발송 건수 (발송 횟수 제한용) */
  countSendsSince(phone: string, since: string): Promise<number>;
  incrementAttempt(id: string): Promise<number>;
  markVerified(id: string): Promise<void>;
  markConsumed(id: string): Promise<void>;
  /** 시도 초과 등으로 즉시 폐기 (expires_at을 과거로) */
  expire(id: string): Promise<void>;
}

function createMockPhoneVerificationRepository(): PhoneVerificationRepository {
  const store: PhoneVerification[] = [];

  return {
    async create(input) {
      const now = new Date().toISOString();
      const created: PhoneVerification = {
        id: `pverif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: input.phone,
        purpose: input.purpose,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        attemptCount: 0,
        createdAt: now,
      };
      store.unshift(created);
      return created;
    },
    async findById(id) {
      return store.find((v) => v.id === id) ?? null;
    },
    async findLatestActive(phone, purpose) {
      const now = Date.now();
      const candidates = store
        .filter(
          (v) =>
            v.phone === phone &&
            v.purpose === purpose &&
            !v.consumedAt &&
            new Date(v.expiresAt).getTime() > now,
        )
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return candidates[0] ?? null;
    },
    async countSendsSince(phone, since) {
      return store.filter((v) => v.phone === phone && v.createdAt >= since).length;
    },
    async incrementAttempt(id) {
      const record = store.find((v) => v.id === id);
      if (!record) return 0;
      record.attemptCount += 1;
      return record.attemptCount;
    },
    async markVerified(id) {
      const record = store.find((v) => v.id === id);
      if (record) record.verifiedAt = new Date().toISOString();
    },
    async markConsumed(id) {
      const record = store.find((v) => v.id === id);
      if (record) record.consumedAt = new Date().toISOString();
    },
    async expire(id) {
      const record = store.find((v) => v.id === id);
      if (record) record.expiresAt = new Date(0).toISOString();
    },
  };
}

let repository: PhoneVerificationRepository | null = null;

export function getPhoneVerificationRepository(): PhoneVerificationRepository {
  if (!repository) {
    repository = resolveRepository("PhoneVerificationRepository", {
      mock: createMockPhoneVerificationRepository,
      supabase: createSupabasePhoneVerificationRepository,
    });
  }
  return repository;
}
