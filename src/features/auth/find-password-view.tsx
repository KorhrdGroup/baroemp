"use client";

import * as React from "react";
import {
  AuthShell,
  BottomLinks,
  BrandMark,
  Divider,
  HelpText,
  Input,
  Label,
  PageTitle,
  PasswordInput,
  PhoneVerificationField,
  PrimaryButton,
} from "./handoff-ui";
import { resetPasswordWithPhoneAction } from "./find-account-actions";

/** 비밀번호 찾기 — 아이디(이메일) + 휴대전화 인증 → 새 비밀번호 재설정 */
export function FindPasswordView() {
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [verificationId, setVerificationId] = React.useState<string | null>(null);
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const verified = Boolean(verificationId);
  const pwValid = pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
  const pwMatch = pw2.length > 0 && pw === pw2;
  const canSubmit = verified && pwValid && pwMatch && !pending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!verificationId) return;
    setPending(true);
    setError(null);
    const res = await resetPasswordWithPhoneAction({
      email,
      phone,
      verificationId,
      password: pw,
      passwordConfirm: pw2,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "비밀번호 변경에 실패했습니다.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <AuthShell>
        <BrandMark />
        <PageTitle title="비밀번호 변경 완료" desc="새 비밀번호로 로그인해주세요." />
        <div className="rounded-xl bg-slate-100 px-5 py-[18px] text-[14px] text-[#1c1a17]">
          비밀번호가 변경되었습니다.
        </div>
        <BottomLinks items={[{ label: "로그인", href: "/login", strong: true }]} />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <BrandMark />
      <PageTitle title="비밀번호 찾기" desc="아이디와 휴대전화 인증 후 새 비밀번호를 설정합니다." />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="fp-email">아이디 (이메일)</Label>
          <Input
            id="fp-email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <PhoneVerificationField
          purpose="find_password"
          phone={phone}
          onPhoneChange={setPhone}
          onVerified={setVerificationId}
          idPrefix="fp"
        />

        <Divider />

        <div>
          <Label htmlFor="fp-pw">새 비밀번호</Label>
          <PasswordInput
            id="fp-pw"
            autoComplete="new-password"
            placeholder="새 비밀번호 입력"
            disabled={!verified}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <HelpText tone={pw.length === 0 || pwValid ? "muted" : "error"}>영문·숫자 포함 8자 이상</HelpText>
        </div>

        <div>
          <Label htmlFor="fp-pw2">새 비밀번호 확인</Label>
          <PasswordInput
            id="fp-pw2"
            autoComplete="new-password"
            placeholder="새 비밀번호 재입력"
            disabled={!verified}
            invalid={pw2.length > 0 && !pwMatch}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
          {pw2.length > 0 ? (
            <HelpText tone={pwMatch ? "ok" : "error"}>
              {pwMatch ? "비밀번호가 일치합니다" : "비밀번호가 일치하지 않습니다"}
            </HelpText>
          ) : null}
        </div>

        {error ? <HelpText tone="error">{error}</HelpText> : null}

        <PrimaryButton type="submit" disabled={!canSubmit}>
          {pending ? "변경 중..." : "비밀번호 변경"}
        </PrimaryButton>
      </form>

      <BottomLinks
        items={[
          { label: "로그인", href: "/login", strong: true },
          { label: "아이디 찾기", href: "/find-id" },
        ]}
      />
    </AuthShell>
  );
}
