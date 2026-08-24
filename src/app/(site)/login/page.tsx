import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthCard } from "@/features/auth/auth-card";
import { LoginForm } from "@/features/auth/login-form";
import { SocialLoginButtons } from "@/features/auth/social-login-buttons";

export const metadata: Metadata = { title: "로그인 | 한평생 바로취업" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sanitizeNextPath(sp.next, "/mypage");

  // 이미 로그인한 사용자가 뒤로가기 등으로 들어오면 되돌려보낸다.
  // 프록시에도 같은 검사가 있지만 Mock Mode 에서는 프록시가 인증 검사를
  // 통째로 건너뛰므로, 페이지에서도 한 번 더 막는다.
  const user = await getCurrentUser();
  if (user) redirect(next);

  const signupHref = `/signup?next=${encodeURIComponent(next)}`;

  return (
    <AuthCard
      title="로그인"
      description="로그인 후 무료로 이용할 수 있습니다."
      footer={
        <>
          아직 계정이 없으신가요?{" "}
          <Link href={signupHref} className="font-medium text-brand-blue-600 hover:underline">
            회원가입
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
      <SocialLoginButtons />
    </AuthCard>
  );
}
