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

/** 알리고 템플릿 코드. 2026-09-02 승인된 '거주지역 신규 채용공고 안내' 템플릿. */
export const JOB_ALERT_TEMPLATE_CODE = process.env.ALIGO_TEMPLATE_JOB_ALERT ?? "UL_0316";

/** 발송 본문. 승인된 템플릿(UL_0316)과 글자 단위로 같아야 한다. */
export function buildJobAlertBody(m: Pick<JobAlertMessage, "memberName" | "jobTitle" | "companyName" | "regionLabel" | "deadlineLabel">): string {
  return [
    "[한평생 바로취업] 새로운 채용공고 안내",
    "",
    `${m.memberName}님, 설정하신 알림 조건(거주지역 기준)에 맞는 채용공고가 등록되어 안내드립니다.`,
    "",
    `▶ 공고명 : ${m.jobTitle}`,
    `▶ 기관명 : ${m.companyName}`,
    `▶ 근무지 : ${m.regionLabel}`,
    `▶ 마감일 : ${m.deadlineLabel}`,
    "",
    "아래 버튼을 눌러 상세 내용을 확인하실 수 있습니다.",
    "",
    "※ 본 메시지는 회원님이 신청하신 채용공고 알림 서비스에 따라 발송되었습니다. 알림 조건 변경 및 수신 해제는 마이페이지에서 가능합니다.",
  ].join("\n");
}

/** 발송 버튼. 템플릿과 순서·이름이 같아야 한다: 채널 추가(AC) → 공고 자세히 보기(WL) → 알림 끄기(WL). */
export function buildJobAlertButtons(m: Pick<JobAlertMessage, "detailUrl" | "settingsUrl">) {
  return [
    { name: "채널 추가", linkType: "AC", linkTypeName: "채널 추가" },
    { name: "공고 자세히 보기", linkType: "WL", linkTypeName: "웹링크", linkMo: m.detailUrl, linkPc: m.detailUrl },
    { name: "알림 끄기", linkType: "WL", linkTypeName: "웹링크", linkMo: m.settingsUrl, linkPc: m.settingsUrl },
  ];
}

/** 알리고 API 호출 엔드포인트. 중계기가 있으면 경로를 중계기에 붙인다. */
function aligoEndpoint(apiPath: string): { url: string; headers: Record<string, string> } {
  const relayUrl = process.env.ALIGO_RELAY_URL?.trim();
  const headers: Record<string, string> = {};
  if (relayUrl) {
    // ALIGO_RELAY_URL 은 .../aligo/alimtalk 형태. 베이스(.../aligo)에 API 경로를 붙인다.
    const base = relayUrl.replace(/\/alimtalk\/?$/, "");
    if (process.env.ALIGO_RELAY_TOKEN) headers["x-relay-token"] = process.env.ALIGO_RELAY_TOKEN.trim();
    return { url: apiPath === "/akv10/alimtalk/send/" ? relayUrl : `${base}${apiPath}`, headers };
  }
  return { url: `https://kakaoapi.aligo.in${apiPath}`, headers };
}

export interface AligoTemplateInfo {
  code: string;
  name: string;
  content: string;
  buttons: { name: string; linkType: string; linkMo?: string; linkPc?: string }[];
  raw: unknown;
}

/** 알리고에 등록된 템플릿 원본(본문·버튼)을 조회한다. 발송 불일치 원인 대조용. */
export async function fetchAligoTemplate(code: string = JOB_ALERT_TEMPLATE_CODE): Promise<AligoTemplateInfo | { error: string }> {
  const apiKey = process.env.ALIGO_API_KEY?.trim();
  const userId = process.env.ALIGO_USER_ID?.trim();
  const senderKey = process.env.ALIGO_SENDER_KEY?.trim();
  if (!apiKey || !userId || !senderKey) return { error: "알리고 키가 설정되지 않았습니다." };
  const { url, headers } = aligoEndpoint("/akv10/template/list/");
  const form = new URLSearchParams({ apikey: apiKey, userid: userId, senderkey: senderKey, tpl_code: code });
  const res = await fetch(url, { method: "POST", body: form, headers });
  const json = (await res.json()) as { code?: number; message?: string; list?: Record<string, unknown>[] };
  if (json.code !== 0 || !json.list?.length) return { error: json.message ?? `조회 실패 (code ${json.code})` };
  const t = json.list.find((x) => x.templtCode === code) ?? json.list[0];
  const buttons = (Array.isArray(t.buttons) ? t.buttons : []) as { name: string; linkType: string; linkMo?: string; linkPc?: string }[];
  return {
    code: String(t.templtCode ?? code),
    name: String(t.templtName ?? ""),
    content: String(t.templtContent ?? ""),
    buttons,
    raw: t,
  };
}

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
    const body = buildJobAlertBody(message);

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
      // 카카오톡 미사용·수신차단 등으로 알림톡이 실패하면 같은 내용을 문자로 대체 발송한다.
      failover: "Y",
      fsubject_1: "[한평생 바로취업] 새로운 채용공고 안내",
      fmessage_1: `${message.memberName}님, 설정하신 지역의 새 채용공고가 등록되었습니다.\n${message.jobTitle} / ${message.companyName} / ${message.regionLabel}\n${message.detailUrl}`,
      /*
        버튼은 알리고에 등록한 템플릿과 순서·이름이 같아야 한다.
        1) 채널 추가(AC) - 카카오가 이름을 "채널 추가"로 고정
        2) 공고 자세히 보기(WL) 3) 알림 끄기(WL) - 승인된 UL_0316 원문 기준 (2026-09-02 알리고 화면 대조)
        링크의 도메인(www.job24.co.kr)은 템플릿과 같고 경로의 #{공고ID}만 치환된다.
      */
      button_1: JSON.stringify({ button: buildJobAlertButtons(message) }),
    });

    /*
      알리고는 호출 서버 IP를 사전 등록해야 하는데 Vercel은 고정 IP가 없다.
      ALIGO_RELAY_URL 이 있으면 고정 IP 서버의 중계기(scripts/aligo-relay)로 보내고,
      중계기가 알리고로 그대로 전달한다. 중계기와는 공유 토큰으로만 통한다.
    */
    const relayUrl = process.env.ALIGO_RELAY_URL?.trim();
    const endpoint = relayUrl || "https://kakaoapi.aligo.in/akv10/alimtalk/send/";
    const headers: Record<string, string> = {};
    if (relayUrl && process.env.ALIGO_RELAY_TOKEN) headers["x-relay-token"] = process.env.ALIGO_RELAY_TOKEN.trim();

    try {
      const res = await fetch(endpoint, { method: "POST", body: form, headers });
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

/** 알리고 키가 모두 설정돼 실제 발송이 가능한 상태인지. 어드민 화면 표시용. */
export function isAlimtalkConfigured(): boolean {
  return Boolean(
    process.env.ALIGO_API_KEY?.trim() &&
      process.env.ALIGO_USER_ID?.trim() &&
      process.env.ALIGO_SENDER_KEY?.trim() &&
      process.env.ALIGO_SENDER_PHONE?.trim(),
  );
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
