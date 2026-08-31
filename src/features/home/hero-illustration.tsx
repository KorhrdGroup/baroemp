import Image from "next/image";

/**
 * 메인 히어로 사진.
 *
 * 액자에 넣지 않고 배너를 끝까지 채운다. 넓은 화면에서는 오른쪽 절반을 화면 끝까지 덮고,
 * 좁은 화면에서는 문구 아래에 한 줄로 깔린다. 어느 쪽이든 사진의 안쪽 가장자리를 마스크로
 * 흐려 배경으로 녹인다 - 잘라 붙인 티가 나면 배너가 두 조각으로 보인다.
 */
export function HeroIllustration() {
  return (
    <div
      className={[
        "pointer-events-none relative h-56 w-full select-none sm:h-72",
        /*
          정확히 절반만 덮는다. 54% 로 두면 사진의 왼쪽 끝이 문구 칸 안으로 넘어와
          검색창 오른쪽과 겹쳐 보인다. 절반이면 어느 넓이에서든 문구 칸 밖에서 시작한다.
        */
        "lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-1/2",
        // 좁은 화면은 위쪽을, 넓은 화면은 왼쪽을 흐린다.
        "[mask-image:linear-gradient(to_bottom,transparent_0%,#000_28%)]",
        "[-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,#000_28%)]",
        "lg:[mask-image:linear-gradient(to_right,transparent_0%,#000_10%)]",
        "lg:[-webkit-mask-image:linear-gradient(to_right,transparent_0%,#000_10%)]",
      ].join(" ")}
    >
      <Image
        src="/images/hero-consulting-wide.png"
        alt="한평생 바로취업 상담 창구에서 상담사와 나란히 앉아 안내 책자를 보는 중년 여성"
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        /* 사진이 판보다 옆으로 길어 좌우가 조금씩 잘린다. 두 사람이 가운데라 가운데를 기준으로 둔다. */
        className="object-cover object-[62%_center] lg:object-center"
      />
    </div>
  );
}
