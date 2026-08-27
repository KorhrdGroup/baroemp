export interface SmsProvider {
  getProviderName(): string;
  sendVerificationCode(phone: string, code: string): Promise<void>;
}
