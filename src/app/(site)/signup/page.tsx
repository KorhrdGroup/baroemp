import Link from "next/link";
import type { Metadata } from "next";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { AuthCard } from "@/features/auth/auth-card";
import { SignupForm } from "@/features/auth/signup-form";

export const metadata: Metadata = { title: "회원가입 | 한평생 바로취업" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sanitizeNextPath(sp.next, "/mypage");
  const loginHref = `/login?next=${encodeURIComponent(next)}`;

  return (
    <AuthCard
      title="회원가입"
      description="가입 후 무료로 직업진단, 채용공고, 지원제도를 이용할 수 있습니다."
      footer={
        <>
          이미 계정이 있으신가요?{" "}
          <Link href={loginHref} className="font-medium text-brand-blue-600 hover:underline">
            로그인
          </Link>
        </>
      }
    >
      <SignupForm next={next} />
    </AuthCard>
  );
}
