"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  AuthShell,
  BrandMark,
  BottomLinks,
  HelpText,
  Input,
  Label,
  PageTitle,
  PasswordInput,
  PrimaryButton,
  SocialButtons,
} from "./handoff-ui";
import { signInAction, type AuthFormState } from "./auth-actions";

const initialState: AuthFormState = {};

export function LoginView({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  const [id, setId] = React.useState("");
  const [pw, setPw] = React.useState("");
  const canSubmit = id.trim().length > 0 && pw.length > 0 && !pending;

  const signupHref = `/signup?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell>
      <BrandMark />
      <PageTitle title="로그인" desc="이메일 아이디로 로그인하세요." />

      <form action={formAction}>
        <input type="hidden" name="next" value={next} />
        {state.error ? <HelpText tone="error">{state.error}</HelpText> : null}

        <Label htmlFor="login-id">아이디 (이메일)</Label>
        <Input
          id="login-id"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="you@example.com"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />

        <div className="mt-4">
          <Label htmlFor="login-pw">비밀번호</Label>
          <PasswordInput
            id="login-pw"
            name="password"
            autoComplete="current-password"
            placeholder="비밀번호 입력"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
        </div>

        <div className="mt-6">
          <PrimaryButton type="submit" disabled={!canSubmit}>
            {pending ? "로그인 중..." : "로그인"}
          </PrimaryButton>
        </div>
      </form>

      <SocialButtons next={next} />

      <BottomLinks
        items={[
          { label: "아이디 찾기", href: "/find-id" },
          { label: "비밀번호 찾기", href: "/find-password" },
          { label: "회원가입", href: signupHref, strong: true },
        ]}
      />
    </AuthShell>
  );
}
