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
      <PageTitle title="로그인" desc="이메일 또는 휴대전화번호로 로그인하세요." />

      <form action={formAction}>
        <input type="hidden" name="next" value={next} />
        {state.error ? <HelpText tone="error">{state.error}</HelpText> : null}

        <Label htmlFor="login-id">아이디 (이메일 또는 휴대전화번호)</Label>
        <Input
          id="login-id"
          name="email"
          type="text"
          autoComplete="username"
          placeholder="you@example.com 또는 010-0000-0000"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />

        <div className="mt-4">
          <Label htmlFor="login-pw">비밀번호</Label>
          <Input
            id="login-pw"
            name="password"
            type="password"
            autoComplete="current-password"
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
