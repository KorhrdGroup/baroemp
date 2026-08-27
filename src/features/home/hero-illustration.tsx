import Image from "next/image";

/**
 * 메인 히어로 그래픽.
 * 배너 오른쪽 절반을 채우는 일러스트 한 장만 둔다.
 */
export function HeroIllustration() {
  return (
    <div className="relative mx-auto aspect-[3/2] w-full max-w-2xl select-none">
      <Image
        src="/images/hero-illustration.png"
        alt="채용정보 검색 화면이 열린 노트북과 이력서, 서류가 놓인 책상"
        fill
        priority
        sizes="(min-width: 1024px) 42rem, 100vw"
        // 배경이 투명한 PNG라 그대로 얹으면 된다.
        // (흰 배경 JPG 시절 쓰던 mix-blend-multiply 는 불필요해져 제거)
        className="object-contain"
      />

    </div>
  );
}
