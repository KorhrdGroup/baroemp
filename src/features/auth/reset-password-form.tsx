"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePasswordAction, type AuthFormState } from "./auth-actions";
import { FieldError, FormError, FormNotice } from "./auth-card";

const initialState: AuthFormState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState);

  if (state.message) {
    return (
      <div className="space-y-4">
        <FormNotice message={state.message} />
        <Button asChild className="w-full bg-brand-blue-500 hover:bg-brand-blue-600">
          <Link href="/login">로그인하러 가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />

      <div>
        <Label htmlFor="password" className="mb-1.5">
          새 비밀번호
        </Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        <FieldError message={state.fieldErrors?.password} />
      </div>

      <div>
        <Label htmlFor="passwordConfirm" className="mb-1.5">
          새 비밀번호 확인
        </Label>
        <Input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" required />
        <FieldError message={state.fieldErrors?.passwordConfirm} />
      </div>

      <Button type="submit" disabled={pending} className="w-full bg-brand-blue-500 hover:bg-brand-blue-600">
        {pending ? "변경 중..." : "비밀번호 변경"}
      </Button>
    </form>
  );
}
