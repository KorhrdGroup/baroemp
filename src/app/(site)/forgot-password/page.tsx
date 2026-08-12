import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/auth-card";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export const metadata: Metadata = { title: "비밀번호 재설정 | 한평생 바로취업" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="비밀번호 재설정"
      description="가입하신 이메일을 입력하시면 재설정 링크를 보내드립니다."
      footer={
        <Link href="/login" className="font-medium text-brand-blue-600 hover:underline">
          로그인으로 돌아가기
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
