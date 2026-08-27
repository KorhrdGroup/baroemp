import type { Metadata } from "next";
import { FindPasswordView } from "@/features/auth/find-password-view";

export const metadata: Metadata = { title: "비밀번호 찾기 | 한평생 바로취업" };

export default function FindPasswordPage() {
  return <FindPasswordView />;
}
