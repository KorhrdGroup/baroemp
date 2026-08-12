import { XMLParser } from "fast-xml-parser";

/**
 * 고용24(Work24) 채용정보 Open API 응답(XML) 파서.
 *
 * 정확한 Wrapper Element 이름은 계정/명세서 버전에 따라 다를 수 있어(예: wantedRoot/dhsOpenEmpInfo 등),
 * 특정 태그명에 하드코딩으로 의존하지 않고 "wantedAuthNo를 가진 반복 객체 배열"을 재귀적으로 탐색한다.
 * 이렇게 하면 향후 응답 스키마가 소폭 바뀌어도 Adapter 코드를 수정할 필요가 없다.
 */
export interface Work24ParsedList {
  totalCount: number;
  entries: Record<string, unknown>[];
}

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: true,
  trimValues: true,
  isArray: () => false,
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 원본 응답에 "에러" 요소가 있는지 확인한다 (예: 개인회원/인증키 오류). */
export function extractWork24Error(parsed: Record<string, unknown>): string | null {
  const stack: unknown[] = [parsed];
  while (stack.length > 0) {
    const current = stack.pop();
    if (isPlainObject(current)) {
      if (typeof current.error === "string" && current.error.trim()) return current.error.trim();
      if (typeof current.errMsg === "string" && current.errMsg.trim()) return current.errMsg.trim();
      stack.push(...Object.values(current));
    }
  }
  return null;
}

function findEntryArray(node: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(node)) {
    const objectItems = node.filter(isPlainObject);
    if (objectItems.length > 0 && objectItems.some((item) => "wantedAuthNo" in item)) {
      return objectItems;
    }
    for (const item of node) {
      const found = findEntryArray(item);
      if (found) return found;
    }
    return null;
  }
  if (isPlainObject(node)) {
    if ("wantedAuthNo" in node) return [node];
    for (const value of Object.values(node)) {
      const found = findEntryArray(value);
      if (found) return found;
    }
  }
  return null;
}

function findTotalCount(node: unknown): number {
  const stack: unknown[] = [node];
  while (stack.length > 0) {
    const current = stack.pop();
    if (isPlainObject(current)) {
      for (const key of ["total", "totalCount", "totCnt", "count"]) {
        const value = current[key];
        if (value !== undefined && value !== null && !Number.isNaN(Number(value))) {
          return Number(value);
        }
      }
      stack.push(...Object.values(current));
    }
  }
  return 0;
}

export function parseWork24ListXml(xml: string): Work24ParsedList {
  const parsed = parser.parse(xml) as Record<string, unknown>;

  const errorMessage = extractWork24Error(parsed);
  if (errorMessage) {
    throw new Error(`Work24 API 오류: ${errorMessage}`);
  }

  const entries = findEntryArray(parsed) ?? [];
  const totalCount = findTotalCount(parsed) || entries.length;
  return { totalCount, entries };
}
