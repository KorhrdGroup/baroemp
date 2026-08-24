import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "한평생 바로취업 | 중장년 취업 원스톱 플랫폼",
  description:
    "내게 맞는 일자리를 찾고 취업 성공까지 한 번에. 직업진단부터 채용정보, 지원금, 이력서 첨삭, 취업컨설팅까지 함께하는 한평생 바로취업입니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Typekit 스크립트가 하이드레이션 전에 <html>에 wf-loading 클래스를 붙인다
    <html
      lang="ko"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-white text-foreground">
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        {/* Pretendard - HDS 본문 서체. 한글 글자수가 많아 동적 서브셋본 사용 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          precedence="default"
        />
        {/* Adobe Fonts(Typekit) 독립고딕 킷 - rixdongnimgothic-pro */}
        
        <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
