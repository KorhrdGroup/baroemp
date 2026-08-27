"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  AuthShell,
  BottomLinks,
  BrandMark,
  Checkbox,
  HelpText,
  Input,
  InputWithAction,
  Label,
  PageTitle,
  PhoneVerificationField,
  PrimaryButton,
} from "./handoff-ui";
import { signUpAction, type SignUpFormState } from "./auth-actions";
import { checkEmailAvailableAction } from "./find-account-actions";
import { validateSignup, type SignupValues } from "./signup-validation";

const initialState: SignUpFormState = {};

export function SignupView({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [phoneVerificationId, setPhoneVerificationId] = React.useState<string | null>(null);
  const [agreeRequired, setAgreeRequired] = React.useState(false);
  const [agreeMarketing, setAgreeMarketing] = React.useState(false);

  const [emailCheckMessage, setEmailCheckMessage] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [emailChecking, setEmailChecking] = React.useState(false);

  async function handleCheckEmail() {
    if (!email.trim()) {
      setEmailCheckMessage({ ok: false, text: "이메일을 입력해주세요." });
      return;
    }
    setEmailChecking(true);
    const result = await checkEmailAvailableAction(email);
    setEmailChecking(false);
    if (result.error) {
      setEmailCheckMessage({ ok: false, text: result.error });
      return;
    }
    setEmailCheckMessage(
      result.available
        ? { ok: true, text: "사용 가능한 이메일입니다." }
        : { ok: false, text: "이미 가입된 이메일입니다." }
    );
  }

  const values: SignupValues = {
    name,
    email,
    password: pw,
    passwordConfirm: pw2,
    phone,
    privacyConsent: agreeRequired,
  };
  const errors = validateSignup(values);
  const canSubmit = Object.keys(errors).length === 0 && Boolean(phoneVerificationId) && !pending;

  const pwValid = pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
  const pwMatch = pw2.length > 0 && pw === pw2;

  return (
    <AuthShell>
      <BrandMark />
      <PageTitle title="회원가입" desc="가입 후 직업진단, 채용공고, 지원제도를 이용할 수 있습니다." />

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="phoneVerificationId" value={phoneVerificationId ?? ""} />
        {state.error ? <HelpText tone="error">{state.error}</HelpText> : null}

        <div>
          <Label htmlFor="su-name">이름</Label>
          <Input
            id="su-name"
            name="name"
            placeholder="홍길동"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {state.fieldErrors?.name ? <HelpText tone="error">{state.fieldErrors.name}</HelpText> : null}
        </div>

        <div>
          <Label htmlFor="su-email">이메일 (선택)</Label>
          <InputWithAction
            action={emailChecking ? "확인 중..." : "중복확인"}
            onAction={handleCheckEmail}
            inputProps={{
              id: "su-email",
              name: "email",
              type: "email",
              inputMode: "email",
              autoComplete: "username",
              placeholder: "you@example.com",
              value: email,
              onChange: (e) => {
                setEmail(e.target.value);
                setEmailCheckMessage(null);
              },
            }}
          />
          {emailCheckMessage ? (
            <HelpText tone={emailCheckMessage.ok ? "ok" : "error"}>{emailCheckMessage.text}</HelpText>
          ) : null}
          {state.fieldErrors?.email ? <HelpText tone="error">{state.fieldErrors.email}</HelpText> : null}
        </div>

        <div>
          <Label htmlFor="su-pw">비밀번호</Label>
          <Input
            id="su-pw"
            name="password"
            type="password"
            autoComplete="new-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <HelpText tone={pw.length === 0 || pwValid ? "muted" : "error"}>영문·숫자 포함 8자 이상</HelpText>
        </div>

        <div>
          <Label htmlFor="su-pw2">비밀번호 확인</Label>
          <Input
            id="su-pw2"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
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

        <input type="hidden" name="phone" value={phone} />
        <PhoneVerificationField
          purpose="signup"
          phone={phone}
          onPhoneChange={setPhone}
          onVerified={(id) => setPhoneVerificationId(id)}
          idPrefix="su"
        />
        {state.fieldErrors?.phone ? <HelpText tone="error">{state.fieldErrors.phone}</HelpText> : null}

        <div className="flex flex-col gap-[11px] rounded-[14px] bg-[#f5f3ef] px-[18px] py-4">
          <Checkbox
            strong
            checked={agreeRequired && agreeMarketing}
            onChange={(v) => {
              setAgreeRequired(v);
              setAgreeMarketing(v);
            }}
          >
            약관 전체 동의
          </Checkbox>
          <div className="h-px bg-[#e7e2d8]" />
          <Checkbox
            checked={agreeRequired}
            onChange={setAgreeRequired}
            right={
              <a href="/privacy" className="text-[12px] text-[#8b857c] no-underline">
                보기
              </a>
            }
          >
            [필수] 개인정보 수집·이용 동의
          </Checkbox>
          <Checkbox checked={agreeMarketing} onChange={setAgreeMarketing}>
            [선택] 마케팅 정보 수신 동의
          </Checkbox>
          {/* 서버 액션이 checkbox 값을 formData에서 읽으므로 실제 name 속성이 붙은 hidden input으로 동기화한다. */}
          <input type="hidden" name="privacyConsent" value={agreeRequired ? "on" : ""} />
          <input type="hidden" name="marketingConsent" value={agreeMarketing ? "on" : ""} />
        </div>
        {state.fieldErrors?.privacyConsent ? (
          <HelpText tone="error">{state.fieldErrors.privacyConsent}</HelpText>
        ) : null}

        <PrimaryButton type="submit" disabled={!canSubmit}>
          {pending ? "가입 처리 중..." : "회원가입"}
        </PrimaryButton>
      </form>

      <BottomLinks
        items={[
          { label: "이미 계정이 있으신가요?", href: `/login?next=${encodeURIComponent(next)}` },
          { label: "로그인", href: `/login?next=${encodeURIComponent(next)}`, strong: true },
        ]}
      />
    </AuthShell>
  );
}
