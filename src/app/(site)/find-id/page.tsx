import type { Metadata } from "next";
import { FindIdView } from "@/features/auth/find-id-view";

export const metadata: Metadata = { title: "아이디 찾기 | 한평생 바로취업" };

export default function FindIdPage() {
  return <FindIdView />;
}
