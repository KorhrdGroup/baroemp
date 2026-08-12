import { MockSupportProvider } from "./mock-provider";
import { PublicServiceSupportProvider } from "./public-service-provider";
import type { SupportProvider, SupportProviderName } from "./types";

export * from "./types";
export { MockSupportProvider } from "./mock-provider";
export { PublicServiceSupportProvider } from "./public-service-provider";

/**
 * 현재 활성화된 Support Provider 이름을 결정한다.
 * features/jobs/providers/index.ts(resolveActiveJobProviderName)와 동일한 정책이다.
 *
 * 1. SUPPORT_PROVIDER 환경변수가 명시적으로 지정된 경우 그 값을 따른다.
 * 2. 미지정 시 PUBLIC_SERVICE_API_KEY가 있으면 public_service, 없으면 mock.
 * 3. PUBLIC_SERVICE_API_KEY 없이 SUPPORT_PROVIDER=public_service로 강제 지정돼도
 *    (빌드/실행이 깨지지 않도록) mock으로 안전하게 폴백한다.
 */
export function resolveActiveSupportProviderName(): SupportProviderName {
  const forced = process.env.SUPPORT_PROVIDER?.trim().toLowerCase();
  const hasApiKey = Boolean(process.env.PUBLIC_SERVICE_API_KEY?.trim());

  if (forced === "public_service") {
    return hasApiKey ? "public_service" : "mock";
  }
  if (forced === "mock") {
    return "mock";
  }
  return hasApiKey ? "public_service" : "mock";
}

let cachedProvider: SupportProvider | null = null;
let cachedProviderName: SupportProviderName | null = null;

/**
 * 활성 Support Provider 인스턴스를 반환한다.
 * API Key를 나중에 .env.local에 추가하고 SUPPORT_PROVIDER=public_service로 설정하면
 * 코드 수정 없이 즉시 PublicServiceSupportProvider가 활성화된다.
 */
export function getSupportProvider(): SupportProvider {
  const name = resolveActiveSupportProviderName();
  if (cachedProvider && cachedProviderName === name) return cachedProvider;

  if (name === "public_service") {
    const apiKey = process.env.PUBLIC_SERVICE_API_KEY?.trim();
    cachedProvider = apiKey ? new PublicServiceSupportProvider(apiKey) : new MockSupportProvider();
  } else {
    cachedProvider = new MockSupportProvider();
  }
  cachedProviderName = name;
  return cachedProvider;
}

/** 관리자 UI 등에서 "현재 Mock으로 동작 중"임을 안내하기 위한 헬퍼. */
export function isUsingMockSupportProvider(): boolean {
  return resolveActiveSupportProviderName() === "mock";
}
