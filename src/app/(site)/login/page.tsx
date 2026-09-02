import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginView } from "@/features/auth/login-view";

export const metadata: Metadata = { title: "로그인 | 한평생 바로취업" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; provider?: string; reason?: string }>;
}) {
  const sp = await searchParams;
  const next = sanitizeNextPath(sp.next, "/mypage");
  const notice = describeLoginError(sp.error, sp.provider, sp.reason);

  // 이미 로그인한 사용자가 뒤로가기 등으로 들어오면 되돌려보낸다.
  // 프록시에도 같은 검사가 있지만 Mock Mode 에서는 프록시가 인증 검사를
  // 통째로 건너뛰므로, 페이지에서도 한 번 더 막는다.
  const user = await getCurrentUser();
  if (user) redirect(next);

  return <LoginView next={next} notice={notice} />;
}

const PROVIDER_LABELS: Record<string, string> = { kakao: "카카오", naver: "네이버" };

/**
 * 소셜 로그인 콜백이 붙여 보낸 error 를 사람 말로 바꾼다.
 * 전에는 주소에만 error=social_profile_failed 가 남고 화면은 그냥 로그인 창이라, 왜 돌아왔는지 알 수 없었다.
 * reason(KOE010 등)은 원인을 찾는 열쇠라 뒤에 작게 붙인다.
 */
function describeLoginError(error?: string, provider?: string, reason?: string): string | null {
  if (!error) return null;
  const who = PROVIDER_LABELS[provider ?? ""] ?? "소셜";
  const code = reason && reason !== "token" && reason !== "profile" ? ` (오류 코드 ${reason})` : "";
  switch (error) {
    case "social_cancelled":
      return `${who} 로그인을 취소하셨어요. 다시 시도하시려면 아래 버튼을 눌러 주세요.`;
    case "social_state_mismatch":
      return "로그인 요청이 만료됐어요. 다시 시도해 주세요.";
    case "social_profile_failed":
      return `${who}에서 회원 정보를 받아오지 못했어요. 잠시 후 다시 시도해 주세요.${code}`;
    case "social_signin_failed":
      return `${who} 계정으로 로그인 처리에 실패했어요. 잠시 후 다시 시도해 주세요.`;
    case "social_not_configured":
      return `${who} 로그인은 아직 준비 중이에요. 이메일로 로그인해 주세요.`;
    default:
      return null;
  }
}
