import Link from "next/link";
import type { Metadata } from "next";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { AuthCard } from "@/features/auth/auth-card";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "로그인 | 한평생 바로취업" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sanitizeNextPath(sp.next, "/mypage");
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
    </AuthCard>
  );
}
