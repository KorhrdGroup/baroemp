/**
 * SNS 로그인 진입 버튼.
 * /auth/login/{provider} 라우트가 state 발급 후 provider 인증 페이지로 보낸다.
 * (자체 OAuth 구현 - src/lib/auth/social-oauth.ts)
 */

function NaverIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="size-3.5" fill="currentColor">
      <path d="M13.5 10.7 6.2 0H0v20h6.5V9.3L13.8 20H20V0h-6.5z" />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="currentColor">
      <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7-.2.7-.7 2.6-.8 3-.1.5.2.5.4.4.2-.1 2.7-1.8 3.8-2.6.6.1 1.2.1 1.9.1 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
    </svg>
  );
}

export function SocialLoginButtons() {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-label-2 text-slate-400">간편 로그인</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href="/auth/login/naver"
          className="flex h-12 items-center justify-center gap-2 rounded-md bg-[#03C75A] text-label-1 font-semibold text-white transition-colors hover:bg-[#02B351]"
        >
          <NaverIcon />
          네이버 로그인/회원가입
        </a>

        <a
          href="/auth/login/kakao"
          className="flex h-12 items-center justify-center gap-2 rounded-md bg-[#FEE500] text-label-1 font-semibold text-[#191600] transition-colors hover:bg-[#F2DA00]"
        >
          <KakaoIcon />
          카카오 로그인/회원가입
        </a>
      </div>
    </div>
  );
}
