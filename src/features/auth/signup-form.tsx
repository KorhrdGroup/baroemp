"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { signUpAction, type SignUpFormState } from "./auth-actions";
import { FieldError, FormError, FormNotice } from "./auth-card";
import { validateSignup, type SignupValues } from "./signup-validation";

const initialState: SignUpFormState = {};

const emptyValues: SignupValues = {
  name: "",
  email: "",
  password: "",
  passwordConfirm: "",
  phone: "",
  privacyConsent: false,
};

export function SignupForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);
  const [values, setValues] = useState<SignupValues>(emptyValues);
  // 오류는 칸을 벗어났을 때만 보여준다. 입력 중에는 표시하지 않는다.
  const [touched, setTouched] = useState<Partial<Record<keyof SignupValues, boolean>>>({});

  const errors = validateSignup(values);
  const canSubmit = Object.keys(errors).length === 0 && !pending;

  function set<K extends keyof SignupValues>(key: K, value: SignupValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    // 타이핑 중에는 오류를 숨긴다. "hgit@naveri" 처럼 아직 적는 중인 값까지
    // 빨갛게 만들면 입력을 방해한다. 칸을 벗어날 때 다시 검사한다.
    setTouched((prev) => ({ ...prev, [key]: false }));
  }

  function markTouched(key: keyof SignupValues) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  /**
   * 화면에 보여줄 오류.
   * - 서버가 돌려준 오류(중복 이메일 등)를 우선한다.
   * - 칸을 비우면 아직 입력 전으로 보고 표시하지 않는다. 잘못 적었다가 지웠을 때
   *   빨간 상태로 남지 않게 하기 위해서다. 제출 버튼은 여전히 비활성이라
   *   필수값이 빠진 채로 넘어가지는 않는다.
   * - 동의 체크박스는 글자를 지우는 개념이 아니라서 이 규칙을 적용하지 않는다.
   */
  function errorOf(key: keyof SignupValues) {
    if (key !== "privacyConsent" && !String(values[key]).trim()) return undefined;
    return state.fieldErrors?.[key] ?? (touched[key] ? errors[key] : undefined);
  }

  function fieldProps(key: keyof SignupValues) {
    const invalid = Boolean(errorOf(key));
    return {
      "aria-invalid": invalid,
      className: cn(invalid && "border-red-400 focus-visible:border-red-400 focus-visible:ring-red-100"),
      onBlur: () => markTouched(key),
    };
  }

  if (state.message) {
    return <FormNotice message={state.message} />;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormError message={state.error} />

      <div>
        <Label htmlFor="name" className="mb-1.5">
          이름 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder="홍길동"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          {...fieldProps("name")}
        />
        <FieldError message={errorOf("name")} />
      </div>

      <div>
        <Label htmlFor="email" className="mb-1.5">
          이메일 <span className="text-slate-400">(선택)</span>
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          {...fieldProps("email")}
        />
        <FieldError message={errorOf("email")} />
      </div>

      <div>
        <Label htmlFor="password" className="mb-1.5">
          비밀번호 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={values.password}
          onChange={(e) => set("password", e.target.value)}
          {...fieldProps("password")}
        />
        {errorOf("password") ? (
          <FieldError message={errorOf("password")} />
        ) : (
          <p className="mt-1.5 text-label-2 text-slate-400">영문과 숫자를 포함해 8자 이상</p>
        )}
      </div>

      <div>
        <Label htmlFor="passwordConfirm" className="mb-1.5">
          비밀번호 확인 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          value={values.passwordConfirm}
          onChange={(e) => set("passwordConfirm", e.target.value)}
          {...fieldProps("passwordConfirm")}
        />
        <FieldError message={errorOf("passwordConfirm")} />
      </div>

      <div>
        <Label htmlFor="phone" className="mb-1.5">
          휴대전화번호 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          placeholder="010-1234-5678"
          value={values.phone}
          onChange={(e) => set("phone", e.target.value)}
          {...fieldProps("phone")}
        />
        <FieldError message={errorOf("phone")} />
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <label className="flex items-start gap-2 text-label-1 text-slate-700">
          <Checkbox
            name="privacyConsent"
            required
            className="mt-0.5"
            checked={values.privacyConsent}
            onCheckedChange={(checked) => {
              set("privacyConsent", checked === true);
              markTouched("privacyConsent");
            }}
          />
          <span>
            <span className="font-medium">[필수]</span> 개인정보 수집·이용에 동의합니다.
          </span>
        </label>
        <FieldError message={errorOf("privacyConsent")} />

        <label className="flex items-start gap-2 text-label-1 text-slate-700">
          <Checkbox name="marketingConsent" className="mt-0.5" />
          <span>
            <span className="text-slate-500">[선택]</span> 마케팅 정보 수신에 동의합니다.
          </span>
        </label>
      </div>

      <Button
        type="submit"
        disabled={!canSubmit}
        className="h-12 w-full bg-brand-blue-400 hover:bg-brand-blue-600"
      >
        {pending ? "가입 처리 중..." : "회원가입"}
      </Button>
    </form>
  );
}
