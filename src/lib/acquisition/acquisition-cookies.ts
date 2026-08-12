import type { NextRequest, NextResponse } from "next/server";

export interface AcquisitionTouch {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPage?: string;
  referrer?: string;
  capturedAt: string;
}

const FIRST_TOUCH_COOKIE = "baro_acq_first";
const LAST_TOUCH_COOKIE = "baro_acq_last";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

function readTouchFromRequest(request: NextRequest): AcquisitionTouch | null {
  const params = request.nextUrl.searchParams;
  const hasUtm = UTM_KEYS.some((k) => params.get(k));
  if (!hasUtm) return null;

  return {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    utmContent: params.get("utm_content") ?? undefined,
    utmTerm: params.get("utm_term") ?? undefined,
    landingPage: request.nextUrl.pathname,
    referrer: request.headers.get("referer") ?? undefined,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * 방문자의 UTM 유입 정보를 first-touch/last-touch 쿠키에 캡처한다 (proxy.ts에서 매 요청 호출).
 *
 * - first-touch: 아직 쿠키가 없고 UTM 파라미터가 있는 최초 요청에만 기록, 이후 절대 덮어쓰지 않는다.
 * - last-touch: UTM 파라미터가 있는 요청마다 최신값으로 갱신한다.
 *
 * 회원가입 시점에 이 쿠키값을 읽어 user_acquisition.first_touch_at/last_touch_at을 채운다
 * (스펙 28번: 가입 시점 UTM으로 first_touch를 무조건 덮어쓰지 않는다).
 */
export function captureAcquisitionTouch(request: NextRequest, response: NextResponse): void {
  const touch = readTouchFromRequest(request);
  if (!touch) return;

  const cookieOpts = { path: "/", maxAge: ONE_YEAR_SECONDS, sameSite: "lax" as const };

  if (!request.cookies.get(FIRST_TOUCH_COOKIE)) {
    response.cookies.set(FIRST_TOUCH_COOKIE, JSON.stringify(touch), cookieOpts);
  }
  response.cookies.set(LAST_TOUCH_COOKIE, JSON.stringify(touch), cookieOpts);
}

export function readAcquisitionCookiesServer(getCookie: (name: string) => string | undefined): {
  firstTouch: AcquisitionTouch | null;
  lastTouch: AcquisitionTouch | null;
} {
  function parse(raw: string | undefined): AcquisitionTouch | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AcquisitionTouch;
    } catch {
      return null;
    }
  }
  return {
    firstTouch: parse(getCookie(FIRST_TOUCH_COOKIE)),
    lastTouch: parse(getCookie(LAST_TOUCH_COOKIE)),
  };
}

export { FIRST_TOUCH_COOKIE, LAST_TOUCH_COOKIE };
