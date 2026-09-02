"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  AuthShell,
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

export function LoginView({ next, notice }: { next: string; notice?: string | null }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  const [id, setId] = React.useState("");
  const [pw, setPw] = React.useState("");
  const canSubmit = id.trim().length > 0 && pw.length > 0 && !pending;

  const signupHref = `/signup?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell>
      <PageTitle
        title="로그인"
        desc={
          <>
            회원님께 맞는 일자리와 안내를
            <br />
            챙겨드리는 회원 전용 무료 서비스예요.
          </>
        }
      />

      <form action={formAction}>
        <input type="hidden" name="next" value={next} />
        {state.error ? <HelpText tone="error">{state.error}</HelpText> : null}
        {/* 소셜 로그인에서 돌아온 이유. 폼 오류가 있으면 그쪽이 더 최근이라 그것만 보여준다. */}
        {!state.error && notice ? <HelpText tone="error">{notice}</HelpText> : null}

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

        <div className="mt-4">
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
