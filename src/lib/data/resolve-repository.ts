import { DataSourceError } from "./errors";
import { isProductionEnv, isSupabaseMode } from "./mode";

/**
 * Mock ↔ Supabase Repository/Service 구현체 선택 정책을 한 곳에서 관리한다.
 *
 * 정책:
 * - Mock Mode: 항상 Mock 구현체
 * - Supabase Mode + 클라이언트 생성 성공: Supabase 구현체
 * - Supabase Mode + 클라이언트 생성 실패(서비스 키 누락 등):
 *   - 개발환경: Mock으로 폴백 (경고 로그)
 *   - 운영환경: DataSourceError를 던진다 (조용한 성공 처리 금지)
 *
 * 런타임 쿼리 에러(연결은 됐지만 쿼리가 실패하는 경우)는 이 헬퍼의 책임이 아니다.
 * 각 Supabase Repository 구현체가 `throwDataSourceError`로 즉시 던져야 한다.
 */
export function resolveRepository<T>(
  name: string,
  factories: { mock: () => T; supabase: () => T | null },
): T {
  if (!isSupabaseMode()) {
    return factories.mock();
  }

  const supabaseRepo = factories.supabase();
  if (supabaseRepo) return supabaseRepo;

  const message = `[${name}] DATA_SOURCE_MODE=supabase 이지만 Supabase 클라이언트를 생성할 수 없습니다. NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수를 확인하세요.`;

  if (isProductionEnv()) {
    throw new DataSourceError(message);
  }

  console.warn(`${message} (개발환경이므로 Mock으로 폴백합니다)`);
  return factories.mock();
}
