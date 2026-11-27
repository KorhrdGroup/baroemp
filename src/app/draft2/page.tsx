import { loadActiveJobCount, loadFeaturedTabs, loadMidlifeSupportPrograms } from "@/features/home-draft/load-home-data";
import { Draft2ConsultCta, Draft2Hero, Draft2ServiceGrid } from "@/features/home-draft2/draft2-sections";
import {
  Em,
  JobCountTile,
  QualificationRow,
  SectionHeading,
  SituationColumns,
  SupportNewsList,
  SupportTable,
} from "@/features/home-draft2/draft2-lower-sections";
import { JobsBoard } from "@/features/home-draft2/jobs-board";

/*
  둘째 시안의 홈. /draft(둥근 카드 · 회색 판)와 처음부터 끝까지 달라 보이게, 정부 누리집처럼
  흰 바탕에 표 · 목록 · 얇은 선으로 짠다. 남색 첫 화면과 맨 아래 상담 띠, 구역 제목만 포켓컴퍼니식.
  순서: 첫 화면(검색) → 자주 찾는 서비스 → 공고 구역(게시판 · 공고 수 · 지원사업 · 자격증 벤토) → 대표 지원제도 표 → 상황별 서비스 → 상담 띠.
  게시판은 공고를 줄로 보여 주지 찜 단추가 없어 회원 정보는 읽지 않는다.
*/
export default async function Draft2HomePage() {
  const [featuredTabs, activeCount, midlifeSupport] = await Promise.all([
    loadFeaturedTabs(),
    loadActiveJobCount(),
    loadMidlifeSupportPrograms(),
  ]);
  return (
    <div className="bg-white">
      <Draft2Hero activeCount={activeCount} />
      <Draft2ServiceGrid />

      <section className="mx-auto mt-16 max-w-7xl px-4.5 sm:mt-24 lg:px-8">
        <SectionHeading eyebrow="일자리 정보">
          <Em>지금 모집 중인</Em> 일자리
        </SectionHeading>
        {/*
          벤토: 왼쪽 큰 칸은 공고 게시판(오른쪽 세 칸 높이를 다 차지), 오른쪽은 공고 수 → 지원사업 → 자격증 칸.
          /draft 처럼 회색 판 위에 둥근 카드를 띄우지 않고, 흰 바탕에 얇은 선 · 작은 모서리 칸으로만 나눈다.
          지원사업은 가운데 칸이라 남는 세로를 채운다.
        */}
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:grid-rows-[auto_1fr_auto]">
          <div className="overflow-hidden rounded-lg border border-border px-4.5 pt-2 pb-5 sm:px-6 lg:col-span-8 lg:row-span-3">
            <JobsBoard tabs={featuredTabs} />
          </div>
          {activeCount !== null && (
            <div className="lg:col-span-4">
              <JobCountTile activeCount={activeCount} />
            </div>
          )}
          <div className={activeCount !== null ? "lg:col-span-4" : "lg:col-span-4 lg:row-span-2"}>
            <SupportNewsList programs={midlifeSupport.slice(0, 3)} />
          </div>
          <div className="lg:col-span-4">
            <QualificationRow />
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4.5 sm:mt-28 lg:px-8">
        <SectionHeading eyebrow="지원제도" moreHref="/support">
          <Em>신청할 수 있는</Em> 지원금
        </SectionHeading>
        <SupportTable />
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4.5 sm:mt-28 lg:px-8">
        <SectionHeading eyebrow="상황별 서비스">
          <Em>지금 내 상황</Em>에 맞는 서비스
        </SectionHeading>
        <SituationColumns />
      </section>

      <div className="mt-20 sm:mt-28">
        <Draft2ConsultCta />
      </div>
    </div>
  );
}
