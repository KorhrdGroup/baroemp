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

/**
 * profiles.phone 조회용 후보 목록.
 *
 * 과거 데이터는 "010-1234-5678"처럼 하이픈이 포함된 채 저장돼 있고 신규 가입은 숫자만 저장한다.
 * 한쪽 형태로만 조회하면 반대 형태로 저장된 회원을 영영 못 찾으므로(로그인·아이디찾기 실패),
 * 두 형태를 모두 넣어 `.in("phone", ...)`으로 조회한다.
 */
export function phoneMatchCandidates(input: string | undefined | null): string[] {
  const digits = normalizePhone(input);
  if (!digits) return [];
  const formatted = formatPhone(digits);
  return formatted === digits ? [digits] : [digits, formatted];
}
