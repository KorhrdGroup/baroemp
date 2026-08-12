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
