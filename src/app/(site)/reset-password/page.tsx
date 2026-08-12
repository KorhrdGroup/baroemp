import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/auth-card";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata: Metadata = { title: "새 비밀번호 설정 | 한평생 바로취업" };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="새 비밀번호 설정" description="새로 사용할 비밀번호를 입력해주세요.">
      <ResetPasswordForm />
    </AuthCard>
  );
}
