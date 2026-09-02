import "server-only";

/**
 * 알림톡 발송 채널.
 * 알리고(Aligo) 검수·키 발급 전이라 지금은 콘솔 채널만 동작한다. 키가 들어오면
 * AligoAlimtalkProvider 를 채우고 getAlimtalkProvider() 분기만 바꾸면 된다.
 * 호출부(job-alert.service)는 이 인터페이스만 본다.
 */
export interface JobAlertMessage {
  phone: string;
  memberName: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  regionLabel: string;
  deadlineLabel: string;
  detailUrl: string;
  settingsUrl: string;
}

export interface AlimtalkSendResult {
  channel: "console" | "aligo_alimtalk";
  templateCode: string;
  ok: boolean;
  error?: string;
}

export interface AlimtalkProvider {
  sendJobAlert(message: JobAlertMessage): Promise<AlimtalkSendResult>;
}

/** 알리고 템플릿 코드. 검수 승인 후 실제 코드로 바꾼다. */
export const JOB_ALERT_TEMPLATE_CODE = process.env.ALIGO_TEMPLATE_JOB_ALERT ?? "TJ_JOB_ALERT";

/** 개발·검수 전 채널: 보낼 내용을 로그로만 남긴다. 발송 기록에는 channel=console 로 찍힌다. */
class ConsoleAlimtalkProvider implements AlimtalkProvider {
  async sendJobAlert(message: JobAlertMessage): Promise<AlimtalkSendResult> {
    console.info("[alimtalk:console] 채용공고 알림", {
      to: message.phone,
      name: message.memberName,
      job: message.jobTitle,
      url: message.detailUrl,
    });
    return { channel: "console", templateCode: JOB_ALERT_TEMPLATE_CODE, ok: true };
  }
}

/**
 * 알리고 알림톡. 키(ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER_KEY)가 있어야 쓴다.
 * 승인된 템플릿 본문과 변수 치환 결과가 글자 단위로 같아야 발송되므로,
 * 여기 본문은 알리고에 등록한 템플릿 1(거주지역 신규 채용공고 안내)과 맞춰 둔다.
 */
class AligoAlimtalkProvider implements AlimtalkProvider {
  constructor(private readonly config: { apiKey: string; userId: string; senderKey: string; sender: string }) {}

  async sendJobAlert(message: JobAlertMessage): Promise<AlimtalkSendResult> {
    const body = [
      "[한평생 바로취업] 새로운 채용공고 안내",
      "",
      `${message.memberName}님, 설정하신 알림 조건(거주지역 기준)에 맞는 채용공고가 등록되어 안내드립니다.`,
      "",
      `▶ 공고명 : ${message.jobTitle}`,
      `▶ 기관명 : ${message.companyName}`,
      `▶ 근무지 : ${message.regionLabel}`,
      `▶ 마감일 : ${message.deadlineLabel}`,
      "",
      "아래 버튼을 눌러 상세 내용을 확인하실 수 있습니다.",
      "",
      "※ 본 메시지는 회원님이 신청하신 채용공고 알림 서비스에 따라 발송되었습니다. 알림 조건 변경 및 수신 해제는 마이페이지에서 가능합니다.",
    ].join("\n");

    const form = new URLSearchParams({
      apikey: this.config.apiKey,
      userid: this.config.userId,
      senderkey: this.config.senderKey,
      tpl_code: JOB_ALERT_TEMPLATE_CODE,
      sender: this.config.sender,
      receiver_1: message.phone,
      recvname_1: message.memberName,
      subject_1: "새로운 채용공고 안내",
      message_1: body,
      button_1: JSON.stringify({
        button: [
          { name: "공고 자세히 보기", linkType: "WL", linkTypeName: "웹링크", linkMo: message.detailUrl, linkPc: message.detailUrl },
          { name: "알림 설정 변경", linkType: "WL", linkTypeName: "웹링크", linkMo: message.settingsUrl, linkPc: message.settingsUrl },
        ],
      }),
    });

    try {
      const res = await fetch("https://kakaoapi.aligo.in/akv10/alimtalk/send/", { method: "POST", body: form });
      const json = (await res.json()) as { code?: number; message?: string };
      if (json.code === 0) return { channel: "aligo_alimtalk", templateCode: JOB_ALERT_TEMPLATE_CODE, ok: true };
      return { channel: "aligo_alimtalk", templateCode: JOB_ALERT_TEMPLATE_CODE, ok: false, error: json.message ?? `code ${json.code}` };
    } catch (error) {
      return {
        channel: "aligo_alimtalk",
        templateCode: JOB_ALERT_TEMPLATE_CODE,
        ok: false,
        error: error instanceof Error ? error.message : "unknown",
      };
    }
  }
}

export function getAlimtalkProvider(): AlimtalkProvider {
  const apiKey = process.env.ALIGO_API_KEY?.trim();
  const userId = process.env.ALIGO_USER_ID?.trim();
  const senderKey = process.env.ALIGO_SENDER_KEY?.trim();
  const sender = process.env.ALIGO_SENDER_PHONE?.trim();
  if (apiKey && userId && senderKey && sender) {
    return new AligoAlimtalkProvider({ apiKey, userId, senderKey, sender });
  }
  return new ConsoleAlimtalkProvider();
}
