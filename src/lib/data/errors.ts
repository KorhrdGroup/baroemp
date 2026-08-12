/**
 * Supabase 영속화 계층 전용 에러.
 *
 * 운영환경에서 Supabase Mode가 명시되어 있는데 클라이언트를 만들 수 없거나
 * 쿼리가 실패하면, 이 에러를 던져 "저장/조회 실패를 성공처럼" 처리하지 않는다.
 * Mock으로 조용히 폴백하는 대신 호출부(Server Action/Route Handler)가
 * 명확하게 실패를 인지하고 사용자에게 에러를 보여줄 수 있게 한다.
 */
export class DataSourceError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "DataSourceError";
    this.cause = cause;
  }
}

function stringifyUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    // PostgrestError 등은 Error를 상속하지 않는 plain object라 String(error)가 "[object Object]"로 뭉개진다.
    const { message, details, hint, code } = error as Record<string, unknown>;
    if (message || details || hint || code) {
      return [message, details, hint, code].filter(Boolean).join(" | ");
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

/** Supabase 쿼리 에러를 DataSourceError로 감싸서 던진다. */
export function throwDataSourceError(context: string, error: unknown): never {
  const message = stringifyUnknownError(error);
  throw new DataSourceError(`[${context}] Supabase 작업 실패: ${message}`, error);
}
