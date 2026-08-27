/** 디자이너 핸드오프(handoff/auth/ui.tsx) 이식. 인증 화면 전용 웜 톤 컴포넌트. */
"use client";

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { sendPhoneCodeAction, verifyPhoneCodeAction } from "./phone-verification-actions";
import type { PhoneVerificationPurpose } from "@/types";

/* 공통 UI — 시안 1b 톤 (웜 소프트 카드)
   Tailwind 기준. 모바일: 카드가 화면 폭에 맞춰 늘어나고 좌우 여백만 유지 */

export function AuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full justify-center bg-slate-50 px-4 py-8 sm:px-6 sm:py-14">
      <div className="w-full max-w-[460px]">
        <div className="rounded-[20px] sm:rounded-[24px] bg-white px-6 py-8 sm:px-12 sm:py-12 shadow-[0_18px_44px_rgba(60,50,35,0.10)]">
          {children}
        </div>
      </div>
    </div>
  );
}

export function BrandMark() {
  return (
    <div className="mb-7 flex items-center sm:mb-8">
      <Logo height={26} priority />
    </div>
  );
}

export function PageTitle({
  title,
  desc,
}: {
  title: string;
  desc?: string;
}) {
  return (
    <div className="mb-7 sm:mb-8">
      <h1 className="m-0 text-[26px] sm:text-[29px] font-bold leading-[1.3] tracking-[-0.035em] text-[#1c1a17]">
        {title}
      </h1>
      {desc ? (
        <p className="mt-2.5 mb-0 text-[14px] sm:text-[14.5px] leading-[1.6] text-[#8b857c]">
          {desc}
        </p>
      ) : null}
    </div>
  );
}

export function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-[9px] block text-[13.5px] font-bold text-[#1c1a17]"
    >
      {children}
    </label>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ invalid, className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={[
          "h-14 w-full min-w-0 rounded-[14px] px-[18px] text-[16px] text-[#1c1a17] outline-none",
          "placeholder:text-[#b3ac9f] transition-shadow",
          invalid
            ? "border-[1.5px] border-[#e5484d] bg-white"
            : "border-0 bg-[#f5f3ef] focus:ring-2 focus:ring-[#1f5eff]/35",
          className,
        ].join(" ")}
      />
    );
  }
);

/** 입력 + 우측 버튼(인증/중복확인). 모바일에서도 한 줄 유지 */
export function InputWithAction({
  action,
  onAction,
  inputProps,
}: {
  action: string;
  onAction?: () => void;
  inputProps: InputProps;
}) {
  return (
    <div className="flex gap-2">
      <Input {...inputProps} />
      <button
        type="button"
        onClick={onAction}
        className="h-14 flex-none whitespace-nowrap rounded-[14px] border-[1.5px] border-brand-blue-400 bg-white px-4 text-[14px] font-bold text-brand-blue-600 transition-colors hover:bg-brand-blue-400 hover:text-white"
      >
        {action}
      </button>
    </div>
  );
}

export function HelpText({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "ok" | "error";
  children: React.ReactNode;
}) {
  const color =
    tone === "ok"
      ? "text-[#0f9d58]"
      : tone === "error"
      ? "text-[#e5484d]"
      : "text-[#8b857c]";
  return (
    <p className={`mt-[9px] mb-0 text-[12.5px] ${color}`}>{children}</p>
  );
}

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="h-[58px] w-full rounded-[14px] bg-brand-blue-400 text-[16px] font-bold text-white transition-colors hover:bg-brand-blue-600 disabled:bg-slate-300 disabled:text-white"
    >
      {children}
    </button>
  );
}

export function SocialButtons({ next }: { next?: string }) {
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="mt-3 flex flex-col gap-2.5">
      {/* OAuth 시작은 서버 라우트로 이동하는 전체 페이지 네비게이션이라 <a>가 맞다. */}
      <a href={`/auth/login/kakao${q}`} className="flex h-14 w-full items-center justify-center gap-[9px] rounded-[14px] bg-[#fee500] text-[15px] font-bold text-[#191600] transition hover:brightness-95">
        <span className="h-5 w-5 rounded-full bg-[#191600]" aria-hidden />
        카카오 로그인
      </a>
      <a href={`/auth/login/naver${q}`} className="flex h-14 w-full items-center justify-center gap-[9px] rounded-[14px] bg-[#03c75a] text-[15px] font-bold text-white transition hover:brightness-95">
        <span className="h-5 w-5 rounded-full bg-white" aria-hidden />
        네이버로 로그인
      </a>
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  strong,
  children,
  right,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  strong?: boolean;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={[
          "flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] text-[12px] leading-none",
          checked
            ? "bg-[#1f5eff] text-white"
            : "border-[1.5px] border-[#d5cfc3] text-transparent",
        ].join(" ")}
      >
        ✓
      </span>
      <span
        className={
          strong
            ? "text-[13.5px] font-bold text-[#1c1a17]"
            : "text-[13px] text-[#4a463f]"
        }
      >
        {children}
      </span>
      {right ? <span className="ml-auto">{right}</span> : null}
    </label>
  );
}

export function BottomLinks({
  items,
}: {
  items: { label: string; href: string; strong?: boolean }[];
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-[14px] gap-y-1.5 text-[13px]">
      {items.map((it, i) => (
        <React.Fragment key={it.href + it.label}>
          {i > 0 ? <span className="text-[#dcd7cd]">·</span> : null}
          <Link
            href={it.href}
            className={
              it.strong
                ? "font-bold text-[#1c1a17] no-underline"
                : "text-[#8b857c] no-underline hover:text-[#1c1a17]"
            }
          >
            {it.label}
          </Link>
        </React.Fragment>
      ))}
    </div>
  );
}

export function Divider() {
  return <div className="my-[22px] h-px bg-[#eee9df]" />;
}

/**
 * 휴대전화 입력 + 인증번호 발송/검증 블록.
 * 검증 성공 시 상위로 verificationId를 올려주고, 번호가 바뀌면 인증 상태를 초기화한다.
 */
export function PhoneVerificationField({
  purpose,
  phone,
  onPhoneChange,
  onVerified,
  idPrefix,
}: {
  purpose: PhoneVerificationPurpose;
  phone: string;
  onPhoneChange: (v: string) => void;
  onVerified: (verificationId: string | null) => void;
  idPrefix: string;
}) {
  const [code, setCode] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [left, setLeft] = React.useState(0);
  const [verified, setVerified] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!sent || left <= 0) return;
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [sent, left]);

  const mmss = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;

  async function handleSend() {
    setBusy(true);
    setError(null);
    const result = await sendPhoneCodeAction({ phone, purpose });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "인증번호 발송에 실패했습니다.");
      return;
    }
    setSent(true);
    setLeft(180);
    setVerified(false);
    onVerified(null);
  }

  async function handleVerify() {
    setBusy(true);
    setError(null);
    const result = await verifyPhoneCodeAction({ phone, code, purpose });
    setBusy(false);
    if (!result.ok || !result.verificationId) {
      setError(result.error ?? "인증번호가 올바르지 않습니다.");
      return;
    }
    setVerified(true);
    onVerified(result.verificationId);
  }

  return (
    <>
      <div>
        <Label htmlFor={`${idPrefix}-phone`}>휴대전화번호</Label>
        <InputWithAction
          action={sent ? "재전송" : "인증"}
          onAction={handleSend}
          inputProps={{
            id: `${idPrefix}-phone`,
            type: "tel",
            inputMode: "tel",
            autoComplete: "tel",
            placeholder: "010-0000-0000",
            value: phone,
            disabled: busy || verified,
            onChange: (e) => {
              onPhoneChange(e.target.value);
              setVerified(false);
              setSent(false);
              onVerified(null);
            },
          }}
        />
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-code`}>인증번호</Label>
        <div className="flex gap-2">
          <Input
            id={`${idPrefix}-code`}
            inputMode="numeric"
            maxLength={6}
            placeholder="6자리 입력"
            value={code}
            disabled={!sent || verified}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <button
            type="button"
            onClick={handleVerify}
            disabled={!sent || verified || code.length !== 6 || busy}
            className={[
              "h-14 w-[78px] flex-none rounded-[14px] text-[14px] font-bold transition-colors disabled:opacity-50",
              verified
                ? "bg-[#eaf3ec] text-[#0f9d58]"
                : "border-[1.5px] border-[#1c1a17] bg-white text-[#1c1a17] hover:bg-[#1c1a17] hover:text-white",
            ].join(" ")}
          >
            {verified ? "완료" : "확인"}
          </button>
        </div>
        {verified ? <HelpText tone="ok">인증이 완료되었습니다</HelpText> : null}
        {!verified && sent ? <HelpText>남은 시간 {mmss}</HelpText> : null}
        {error ? <HelpText tone="error">{error}</HelpText> : null}
      </div>
    </>
  );
}
