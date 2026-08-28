/**
 * 직업 데이터의 자격 요건은 필수와 우대가 한 배열(requiredQualifications)에 섞여 있고,
 * 구분은 이름 뒤 "(우대)" 접미사에만 있다. (예: "보육교사 2급" vs "평생교육사 2급(우대)")
 *
 * 스키마를 나누는 게 맞지만 그 전까지는 이 헬퍼로 읽는 쪽에서 갈라 쓴다.
 * 접미사를 화면에 그대로 노출하면 자격 이름처럼 보이므로 표시할 때는 떼어낸다.
 */
const PREFERRED_SUFFIX = "(우대)";

export function isPreferredQualification(qualification: string): boolean {
  return qualification.trim().endsWith(PREFERRED_SUFFIX);
}

/** 화면에 쓰는 자격 이름. "(우대)" 접미사를 뗀다. */
export function qualificationName(qualification: string): string {
  const trimmed = qualification.trim();
  return trimmed.endsWith(PREFERRED_SUFFIX)
    ? trimmed.slice(0, -PREFERRED_SUFFIX.length).trim()
    : trimmed;
}

/** 필수 자격을 갖추지 못했을 때의 "고려할 점" 문구. 매처가 쓰고 화면이 되읽는다. */
export const NO_REQUIRED_QUALIFICATION_RISK = "현재 관련 자격을 보유하지 않았습니다.";
