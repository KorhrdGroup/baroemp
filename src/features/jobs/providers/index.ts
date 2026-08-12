import { MockJobProvider } from "./mock-provider";
import { Work24JobProvider } from "./work24-provider";
import type { JobProvider, JobProviderName } from "./types";

export * from "./types";
export { MockJobProvider } from "./mock-provider";
export { Work24JobProvider } from "./work24-provider";
export { adaptWork24Entry } from "./work24-provider";

/**
 * 현재 활성화된 Job Provider 이름을 결정한다.
 *
 * 우선순위:
 * 1. JOB_PROVIDER 환경변수가 명시적으로 지정된 경우 그 값을 따른다.
 * 2. 미지정 시 WORK24_API_KEY가 있으면 work24, 없으면 mock.
 *
 * WORK24_API_KEY가 없는데 JOB_PROVIDER=work24로 강제 지정된 경우에는
 * (빌드/실행이 깨지지 않도록) mock으로 안전하게 폴백한다.
 */
export function resolveActiveJobProviderName(): JobProviderName {
  const forced = process.env.JOB_PROVIDER?.trim().toLowerCase();
  const hasWork24Key = Boolean(process.env.WORK24_API_KEY?.trim());

  if (forced === "work24") {
    return hasWork24Key ? "work24" : "mock";
  }
  if (forced === "mock") {
    return "mock";
  }
  return hasWork24Key ? "work24" : "mock";
}

let cachedProvider: JobProvider | null = null;
let cachedProviderName: JobProviderName | null = null;

/**
 * 활성 Job Provider 인스턴스를 반환한다.
 * API Key를 나중에 .env.local에 추가하고 JOB_PROVIDER=work24로 설정하면
 * 코드 수정 없이 즉시 Work24Provider가 활성화된다.
 */
export function getJobProvider(): JobProvider {
  const name = resolveActiveJobProviderName();
  if (cachedProvider && cachedProviderName === name) return cachedProvider;

  if (name === "work24") {
    const apiKey = process.env.WORK24_API_KEY?.trim();
    cachedProvider = apiKey ? new Work24JobProvider(apiKey) : new MockJobProvider();
  } else {
    cachedProvider = new MockJobProvider();
  }
  cachedProviderName = name;
  return cachedProvider;
}

/** 관리자 UI 등에서 "현재 Mock으로 동작 중"임을 안내하기 위한 헬퍼. */
export function isUsingMockJobProvider(): boolean {
  return resolveActiveJobProviderName() === "mock";
}
