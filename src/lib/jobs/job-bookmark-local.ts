const STORAGE_KEY = "baro_job_bookmarks_local";

const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) listener();
}

/** useSyncExternalStore와 함께 사용해 SSR-safe하게 로컬 찜 상태를 구독한다. */
export function subscribeLocalJobBookmarks(callback: () => void): () => void {
  listeners.add(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
    }
  };
}

function readAll(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeAll(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // no-op: storage may be unavailable (private mode 등)
  }
}

/**
 * 비회원 채용공고 찜 로컬 저장소.
 * 로그인 사용자는 이 유틸을 사용하지 않고 job-actions.ts의 서버 액션(DB 저장)을 사용한다.
 * 로그인/회원가입 시 getLocalJobBookmarkIds()로 읽어 mergeLocalJobBookmarksAction()에 전달한 뒤
 * clearLocalJobBookmarks()로 로컬 저장소를 비운다.
 */
export function getLocalJobBookmarkIds(): string[] {
  return readAll();
}

export function isLocalJobBookmarked(jobId: string): boolean {
  return readAll().includes(jobId);
}

export function toggleLocalJobBookmark(jobId: string): boolean {
  const current = readAll();
  const exists = current.includes(jobId);
  const next = exists ? current.filter((id) => id !== jobId) : [...current, jobId];
  writeAll(next);
  emitChange();
  return !exists;
}

export function clearLocalJobBookmarks(): void {
  writeAll([]);
  emitChange();
}
