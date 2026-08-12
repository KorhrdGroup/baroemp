const STORAGE_KEY = "baro_anonymous_id";

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * 비회원 사용자를 위한 anonymous_id 를 브라우저에 안전하게 생성/보관한다.
 * localStorage를 1차 저장소로 쓰고, 쿠키에도 동일 값을 백업해 둔다.
 * 회원가입/로그인 시 이 값을 서버로 전달하면 linkAnonymousCareerDataToUser()로 데이터를 병합할 수 있다.
 */
export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = generateId();
    window.localStorage.setItem(STORAGE_KEY, id);
    document.cookie = `${STORAGE_KEY}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    return id;
  } catch {
    return generateId();
  }
}

export function getStoredAnonymousId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearAnonymousId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    document.cookie = `${STORAGE_KEY}=; path=/; max-age=0`;
  } catch {
    // no-op: storage may be unavailable (private mode 등)
  }
}
