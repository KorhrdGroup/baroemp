"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction, type AuthFormState } from "./auth-actions";
import { FieldError, FormError, FormNotice } from "./auth-card";

const initialState: AuthFormState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

  if (state.message) {
    return <FormNotice message={state.message} />;
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />

      <div>
        <Label htmlFor="email" className="mb-1.5">
          이메일
        </Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        <FieldError message={state.fieldErrors?.email} />
      </div>

      <Button type="submit" disabled={pending} className="w-full bg-brand-blue-400 hover:bg-brand-blue-600">
        {pending ? "전송 중..." : "재설정 메일 보내기"}
      </Button>
    </form>
  );
}
