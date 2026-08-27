import { createHmac } from "node:crypto";
import type { SmsProvider } from "./types";

const SENS_HOST = "https://sens.apigw.ntruss.com";

export interface NcpSensConfig {
  serviceId: string;
  accessKey: string;
  secretKey: string;
  senderPhone: string;
}

/**
 * 네이버 클라우드 플랫폼 SENS SMS v2 발송 Provider.
 * 서명 규격: HMAC-SHA256("POST {uri}\n{timestamp}\n{accessKey}", secretKey) → base64
 */
export class NcpSensSmsProvider implements SmsProvider {
  constructor(private readonly config: NcpSensConfig) {}

  getProviderName(): string {
    return "ncp-sens";
  }

  async sendVerificationCode(phone: string, code: string): Promise<void> {
    const uri = `/sms/v2/services/${this.config.serviceId}/messages`;
    const timestamp = String(Date.now());
    const signature = createHmac("sha256", this.config.secretKey)
      .update(`POST ${uri}\n${timestamp}\n${this.config.accessKey}`)
      .digest("base64");

    const content = `[한평생 바로취업] 인증번호 ${code} 를 입력해주세요. (3분 이내)`;

    const response = await fetch(`${SENS_HOST}${uri}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-ncp-apigw-timestamp": timestamp,
        "x-ncp-iam-access-key": this.config.accessKey,
        "x-ncp-apigw-signature-v2": signature,
      },
      body: JSON.stringify({
        type: "SMS",
        contentType: "COMM",
        countryCode: "82",
        from: this.config.senderPhone,
        content,
        messages: [{ to: phone }],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`SENS 발송 실패 (${response.status}): ${body.slice(0, 200)}`);
    }
  }
}
