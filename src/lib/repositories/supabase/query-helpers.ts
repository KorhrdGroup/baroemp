import type { PostgrestError } from "@supabase/supabase-js";
import { throwDataSourceError } from "@/lib/data/errors";

/**
 * Supabase 쿼리 결과의 error를 체크해 즉시 DataSourceError로 던진다.
 * "에러가 났는데 빈 배열/null을 정상 응답처럼 반환" 하는 패턴을 방지한다.
 */
export function unwrap<T>(context: string, result: { data: T | null; error: PostgrestError | null }): T {
  if (result.error) {
    throwDataSourceError(context, result.error);
  }
  return result.data as T;
}

/** UUID 형식인지. id 열이 uuid 인 표에 다른 값을 넣으면 Postgres가 22P02 오류를 내니, 묻기 전에 "없음"으로 거른다. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** findById / maybeSingle 처럼 "없음"이 정상인 케이스. error만 체크한다. */
export function unwrapMaybe<T>(
  context: string,
  result: { data: T | null; error: PostgrestError | null },
): T | null {
  if (result.error) {
    throwDataSourceError(context, result.error);
  }
  return result.data;
}

/** findAll 처럼 data가 null이면 빈 배열로 취급하되, error는 던진다. */
export function unwrapList<T>(
  context: string,
  result: { data: T[] | null; error: PostgrestError | null },
): T[] {
  if (result.error) {
    throwDataSourceError(context, result.error);
  }
  return result.data ?? [];
}
