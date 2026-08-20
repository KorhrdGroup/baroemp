import Image from "next/image";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

/** 원본 SVG 비율. 폭만 지정하면 높이는 이 비율로 따라간다. */
const FULL_RATIO = 343.36 / 42.34;

export type LogoVariant =
  /** 컬러 마크 + 검정 워드마크. 밝은 배경 기본값 */
  | "default"
  /** 컬러 마크 + 흰 워드마크. 어두운 배경 */
  | "onDark"
  /** 전체 흰색 단색 */
  | "white"
  /** 전체 검정 단색 */
  | "black"
  /** 원형 마크만. 좁은 자리 */
  | "mark";

const SOURCES: Record<LogoVariant, string> = {
  default: "/logo/logo.svg",
  onDark: "/logo/logo-on-dark.svg",
  white: "/logo/logo-white.svg",
  black: "/logo/logo-black.svg",
  mark: "/logo/logo-mark.svg",
};

interface LogoProps {
  variant?: LogoVariant;
  /** 렌더링 높이(px). 폭은 비율로 계산된다. */
  height?: number;
  className?: string;
  /** 헤더처럼 첫 화면에 바로 보이는 자리에서만 켠다. */
  priority?: boolean;
}

export function Logo({ variant = "default", height = 28, className, priority = false }: LogoProps) {
  const width = variant === "mark" ? height : Math.round(height * FULL_RATIO);

  return (
    <Image
      src={SOURCES[variant]}
      alt={siteConfig.name}
      width={width}
      height={height}
      priority={priority}
      className={cn("h-auto w-auto select-none", className)}
      style={{ height, width }}
    />
  );
}
