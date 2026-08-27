import type { SmsProvider } from "./types";

/** NCP SENS 키가 없을 때 쓰는 개발 전용 Provider. 실제로 발송하지 않고 서버 콘솔에만 출력한다. */
export class ConsoleSmsProvider implements SmsProvider {
  getProviderName(): string {
    return "console";
  }

  async sendVerificationCode(phone: string, code: string): Promise<void> {
    console.log(`[SMS:console] ${phone} 인증번호 ${code}`);
  }
}
