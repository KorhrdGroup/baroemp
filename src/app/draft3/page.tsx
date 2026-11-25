import { loadActiveJobCount, loadFeaturedTabs, loadMidlifeSupportPrograms } from "@/features/home-draft/load-home-data";
import { Draft2Hero } from "@/features/home-draft2/draft2-sections";
import { SituationColumns } from "@/features/home-draft2/draft2-lower-sections";
import {
  Draft3ConsultBand,
  Draft3Heading,
  Draft3NewsList,
  Draft3QualificationLinks,
  Draft3ServiceGrid,
} from "@/features/home-draft3/draft3-sections";
import { JobCardTabs } from "@/features/home-draft3/job-card-tabs";
import { SupportBento } from "@/features/home-draft3/support-bento";
import { getUserJobBookmarkIdsAction } from "@/features/jobs/job-actions";
import { getCurrentUser } from "@/lib/auth/session";

/*
  셋째 시안: /draft 는 카드뿐이고 /draft2 는 목록뿐이라, 내용에 따라 형식을 고른다.
  - 카드: 견줘 볼 숫자가 있는 것(공고)
  - 목록: 글로 훑어보는 것(상황별 바로가기 · 지원사업 소식 · 자격증)
  - 카드 + 목록 벤토: 대표 하나를 세우고 나머지를 줄 세우는 것(지원금)
  - 띠 · 판: 행동을 이끄는 것(첫 화면 검색 · 서비스 입구 · 상담 - 상담은 평면 그림 한 장과 함께)
  카드 구역 → 카드+목록 구역 → 목록 구역이 번갈아 나와 리듬을 만든다. 회색 바탕은 공고 카드 구역 한 곳에만 깐다.
  간격은 구역마다 같지 않게: 성격이 같은 목록 두 구역(상황별 · 소식)은 가깝게 붙이고, 나머지는 넓게 띄운다.
  상자를 겹겹이 두지 않는다: 테두리 대신 여백 · 가는 구분선 · 바탕색으로 나눈다.
  파랑은 아낀다: 구역 제목은 머리말 한 줄만 파랗고 큰 제목은 검정, 지원금 금액도 대표 한 건만 파랗게.
*/
export default async function Draft3HomePage() {
  const [featuredTabs, activeCount, midlifeSupport, user] = await Promise.all([
    loadFeaturedTabs(),
    loadActiveJobCount(),
    loadMidlifeSupportPrograms(),
    getCurrentUser(),
  ]);
  // 찜 상태는 회원마다 달라 캐시에 넣지 않는다.
  const bookmarkedIds = user ? await getUserJobBookmarkIdsAction() : [];
  return (
    <div className="bg-white">
      <Draft2Hero activeCount={activeCount} />
      <Draft3ServiceGrid />

      {/* 카드 구역: 회색 바탕 위 흰 공고 카드 */}
      <section className="mt-16 bg-gov-surface py-14 sm:mt-24 sm:py-20">
        <div className="mx-auto max-w-7xl px-4.5 lg:px-8">
          <Draft3Heading eyebrow="일자리 정보" moreHref="/jobs">
            지금 모집 중인 일자리
          </Draft3Heading>
          <div className="mt-6">
            <JobCardTabs tabs={featuredTabs} isAuthenticated={Boolean(user)} bookmarkedIds={bookmarkedIds} />
          </div>
        </div>
      </section>

      {/* 카드 + 목록 구역 */}
      <section className="mx-auto mt-20 max-w-7xl px-4.5 sm:mt-28 lg:px-8">
        <Draft3Heading eyebrow="지원제도" moreHref="/support">
          신청할 수 있는 지원금
        </Draft3Heading>
        <SupportBento />
      </section>

      {/* 목록 구역 */}
      <section className="mx-auto mt-20 max-w-7xl px-4.5 sm:mt-28 lg:px-8">
        <Draft3Heading eyebrow="상황별 서비스">
          지금 내 상황에 맞는 서비스
        </Draft3Heading>
        <SituationColumns />
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-4.5 sm:mt-20 lg:px-8">
        <Draft3Heading eyebrow="더 알아보기">
          중장년 소식과 자격증
        </Draft3Heading>
        <div className="mt-8 grid grid-cols-1 items-start gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
          <Draft3NewsList programs={midlifeSupport.slice(0, 4)} />
          <Draft3QualificationLinks />
        </div>
      </section>

      <div className="mt-20 pb-20 sm:mt-28 sm:pb-28">
        <Draft3ConsultBand />
      </div>
    </div>
  );
}
