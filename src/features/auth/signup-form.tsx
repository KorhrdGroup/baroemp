"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { signUpAction, type SignUpFormState } from "./auth-actions";
import { FieldError, FormError, FormNotice } from "./auth-card";

const initialState: SignUpFormState = {};

export function SignupForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

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
        <Input id="name" name="name" type="text" autoComplete="name" required placeholder="홍길동" />
        <FieldError message={state.fieldErrors?.name} />
      </div>

      <div>
        <Label htmlFor="email" className="mb-1.5">
          이메일 <span className="text-red-500">*</span>
        </Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        <FieldError message={state.fieldErrors?.email} />
      </div>

      <div>
        <Label htmlFor="password" className="mb-1.5">
          비밀번호 <span className="text-red-500">*</span>
        </Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        <FieldError message={state.fieldErrors?.password} />
      </div>

      <div>
        <Label htmlFor="passwordConfirm" className="mb-1.5">
          비밀번호 확인 <span className="text-red-500">*</span>
        </Label>
        <Input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" required />
        <FieldError message={state.fieldErrors?.passwordConfirm} />
      </div>

      <div>
        <Label htmlFor="phone" className="mb-1.5">
          휴대전화번호 <span className="text-slate-400">(선택)</span>
        </Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="010-1234-5678" />
        <FieldError message={state.fieldErrors?.phone} />
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <Checkbox name="privacyConsent" required className="mt-0.5" />
          <span>
            <span className="font-medium">[필수]</span> 개인정보 수집·이용에 동의합니다.
          </span>
        </label>
        <FieldError message={state.fieldErrors?.privacyConsent} />

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <Checkbox name="marketingConsent" className="mt-0.5" />
          <span>
            <span className="text-slate-500">[선택]</span> 마케팅 정보 수신에 동의합니다.
          </span>
        </label>
      </div>

      <Button type="submit" disabled={pending} className="w-full bg-brand-blue-500 hover:bg-brand-blue-600">
        {pending ? "가입 처리 중..." : "회원가입"}
      </Button>
    </form>
  );
}
