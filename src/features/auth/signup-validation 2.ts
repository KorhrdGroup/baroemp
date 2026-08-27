import { isValidKoreanPhone } from "@/lib/utils/phone";

/**
 * 회원가입 입력 검증 규칙.
 *
 * 서버 액션(signUpAction)과 클라이언트 폼이 같은 함수를 쓴다.
 * 규칙을 양쪽에 따로 적으면 화면에서는 통과했는데 서버에서 막히는(또는 그 반대)
 * 상황이 생긴다. 클라이언트 검증은 편의일 뿐이고 최종 판단은 항상 서버가 한다.
 */

export interface SignupValues {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  phone: string;
  privacyConsent: boolean;
}

export type SignupFieldErrors = Partial<Record<keyof SignupValues, string>>;

export function validateSignup(values: SignupValues): SignupFieldErrors {
  const errors: SignupFieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim().toLowerCase();
  const phone = values.phone.trim();

  if (!name || name.length < 2) errors.name = "이름을 2자 이상 입력해주세요.";
  // 이메일은 선택 항목 - 입력했을 때만 형식을 본다.
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "올바른 이메일 형식이 아닙니다.";
  if (values.password.length < 8 || !/[a-zA-Z]/.test(values.password) || !/[0-9]/.test(values.password)) {
    errors.password = "비밀번호는 영문/숫자를 포함해 8자 이상이어야 합니다.";
  }
  if (values.password !== values.passwordConfirm) {
    errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
  }
  if (!values.privacyConsent) {
    errors.privacyConsent = "개인정보 수집·이용에 동의해야 가입할 수 있습니다.";
  }
  // 휴대전화번호는 필수 항목이다 (상담 연락·전화번호 로그인 식별자).
  if (!phone) errors.phone = "휴대전화번호를 입력해주세요.";
  else if (!isValidKoreanPhone(phone)) errors.phone = "휴대전화번호 형식을 확인해주세요.";

  return errors;
}

export function isSignupValid(values: SignupValues): boolean {
  return Object.keys(validateSignup(values)).length === 0;
}
