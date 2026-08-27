"use client";

import { usePathname } from "next/navigation";

/** 몰입해서 작성하는 화면에서는 푸터를 숨겨 집중도를 높인다. */
const HIDDEN_FOOTER_PATTERNS = [/^\/resume\/[^/]+\/edit$/, /^\/cover-letter\/[^/]+\/edit$/];

export function SiteFooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (HIDDEN_FOOTER_PATTERNS.some((pattern) => pattern.test(pathname))) return null;
  return <>{children}</>;
}
