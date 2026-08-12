/**
 * DB Password 없이 Supabase Management API(Personal Access Token)로
 * 원격 프로젝트에 대해 SQL을 실행하기 위한 공용 헬퍼.
 *
 * Docker/Supabase CLI(supabase link, db push)를 쓸 수 없는 환경에서
 * migration 적용 및 스키마 점검 용도로 사용한다.
 *
 * 필요 환경변수:
 * - NEXT_PUBLIC_SUPABASE_URL (project ref 추출용)
 * - SUPABASE_ACCESS_TOKEN (Personal Access Token — DB Password 아님)
 */

export function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.");
  const host = new URL(url).hostname; // {ref}.supabase.co
  const ref = host.split(".")[0];
  if (!ref) throw new Error(`project ref를 URL에서 추출하지 못했습니다: ${url}`);
  return ref;
}

export function getAccessToken(): string {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "SUPABASE_ACCESS_TOKEN이 설정되지 않았습니다. Supabase Dashboard > Account > Access Tokens 에서 발급 후 .env.local에 추가하세요.",
    );
  }
  return token;
}

type QueryResult = { ok: true; rows: unknown[] } | { ok: false; status: number; error: unknown };

async function runQuery(endpoint: "database/query" | "database/query/read-only", sql: string): Promise<QueryResult> {
  const ref = getProjectRef();
  const token = getAccessToken();
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, status: res.status, error: body };
  }
  return { ok: true, rows: Array.isArray(body) ? body : [] };
}

/** 읽기 전용 쿼리 (SELECT). 스키마/데이터 점검용. */
export function runReadOnlyQuery(sql: string): Promise<QueryResult> {
  return runQuery("database/query/read-only", sql);
}

/** 쓰기 가능 쿼리 (DDL/DML). Migration 적용용. */
export function runWriteQuery(sql: string): Promise<QueryResult> {
  return runQuery("database/query", sql);
}

export async function getProjectInfo(): Promise<Record<string, unknown>> {
  const ref = getProjectRef();
  const token = getAccessToken();
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`프로젝트 조회 실패 (${res.status}): ${JSON.stringify(body)}`);
  return body;
}
