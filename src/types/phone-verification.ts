export type PhoneVerificationPurpose = "signup" | "find_id" | "find_password";

/** 휴대폰 인증번호 발급 1건. code는 절대 저장하지 않고 codeHash만 보관한다. */
export interface PhoneVerification {
  id: string;
  phone: string;
  purpose: PhoneVerificationPurpose;
  codeHash: string;
  expiresAt: string;
  attemptCount: number;
  verifiedAt?: string;
  consumedAt?: string;
  createdAt: string;
}

export interface PhoneVerificationCreateInput {
  phone: string;
  purpose: PhoneVerificationPurpose;
  codeHash: string;
  expiresAt: string;
}
