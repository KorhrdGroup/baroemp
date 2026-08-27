import { ConsoleSmsProvider } from "./console.provider";
import { NcpSensSmsProvider } from "./ncp-sens.provider";
import type { SmsProvider } from "./types";

export type { SmsProvider } from "./types";

function readSensConfig() {
  const serviceId = process.env.NCP_SENS_SERVICE_ID?.trim();
  const accessKey = process.env.NCP_SENS_ACCESS_KEY?.trim();
  const secretKey = process.env.NCP_SENS_SECRET_KEY?.trim();
  const senderPhone = process.env.NCP_SENS_SENDER_PHONE?.trim();
  if (!serviceId || !accessKey || !secretKey || !senderPhone) return null;
  return { serviceId, accessKey, secretKey, senderPhone };
}

/** SENS 키가 모두 있으면 실제 발송, 아니면 개발용 콘솔 Provider. 운영에서 키가 없으면 null. */
export function getSmsProvider(): SmsProvider | null {
  const config = readSensConfig();
  if (config) return new NcpSensSmsProvider(config);
  // fail-closed: 운영에서 키가 없으면 인증을 통과시키지 않는다 (설계 2절).
  if (process.env.NODE_ENV === "production") return null;
  return new ConsoleSmsProvider();
}
