/** 휴대전화번호를 숫자만 남긴 내부 표준 형태로 정규화한다 (예: "010-1234-5678" -> "01012345678"). */
export function normalizePhone(input: string | undefined | null): string | undefined {
  if (!input) return undefined;
  const digits = input.replace(/[^0-9]/g, "");
  return digits || undefined;
}

/** 숫자만 있는 내부 표준 전화번호를 화면 표시용으로 하이픈 포맷팅한다. */
export function formatPhone(input: string | undefined | null): string {
  if (!input) return "-";
  const digits = input.replace(/[^0-9]/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return input;
}

/** 한국 휴대전화번호로서 최소한의 형식 검증 (01x + 7~8자리). */
export function isValidKoreanPhone(input: string): boolean {
  const digits = input.replace(/[^0-9]/g, "");
  return /^01[0-9]{8,9}$/.test(digits);
}
