import { Draft3Home } from "@/features/home-draft3/draft3-home";

/*
  홈은 디자인 리뉴얼 셋째 시안(/draft3)으로 바꿨다. 본문은 Draft3Home 한 곳에 두고 /draft3 과 같이 쓴다.
  공고 수 · 추천 공고 · 지원사업 소식은 load-home-data 가 프로세스 안에 10분씩 기억해, 방문마다 새로 세지 않는다.
*/
export default function HomePage() {
  return <Draft3Home />;
}
