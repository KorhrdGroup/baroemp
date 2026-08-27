"use client";

import * as React from "react";
import {
  AuthShell,
  BottomLinks,
  BrandMark,
  HelpText,
  Input,
  Label,
  PageTitle,
  PhoneVerificationField,
  PrimaryButton,
} from "./handoff-ui";
import { findIdAction } from "./find-account-actions";

/** 아이디 찾기 — 이름 + 휴대전화 인증 → 마스킹된 이메일 아이디 안내 */
export function FindIdView() {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [verificationId, setVerificationId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<null | { maskedEmail: string; joinedAt: string }>(null);

  const canSubmit = name.trim().length > 0 && Boolean(verificationId) && !pending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!verificationId) return;
    setPending(true);
    setError(null);
    const res = await findIdAction({ name, phone, verificationId });
    setPending(false);
    if (!res.ok || !res.maskedEmail) {
      setError(res.error ?? "일치하는 회원 정보를 찾을 수 없습니다.");
      return;
    }
    setResult({ maskedEmail: res.maskedEmail, joinedAt: res.joinedAt ?? "" });
  }

  return (
    <AuthShell>
      <BrandMark />
      <PageTitle title="아이디 찾기" desc="가입 시 등록한 휴대전화번호로 확인합니다." />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="fi-name">이름</Label>
          <Input
            id="fi-name"
            placeholder="홍길동"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <PhoneVerificationField
          purpose="find_id"
          phone={phone}
          onPhoneChange={setPhone}
          onVerified={setVerificationId}
          idPrefix="fi"
        />

        {error ? <HelpText tone="error">{error}</HelpText> : null}

        <PrimaryButton type="submit" disabled={!canSubmit}>
          {pending ? "확인 중..." : "아이디 찾기"}
        </PrimaryButton>
      </form>

      {result ? (
        <div className="mt-[22px] rounded-[14px] bg-slate-100 px-5 py-[18px]">
          <div className="mb-2 text-[12.5px] text-slate-500">확인된 아이디</div>
          <div className="text-[16.5px] font-bold tracking-[-0.01em] text-[#1c1a17]">{result.maskedEmail}</div>
          <div className="mt-1.5 text-[12.5px] text-slate-500">{result.joinedAt} 가입</div>
        </div>
      ) : null}

      <BottomLinks
        items={[
          { label: "로그인", href: "/login", strong: true },
          { label: "비밀번호 찾기", href: "/find-password" },
        ]}
      />
    </AuthShell>
  );
}
