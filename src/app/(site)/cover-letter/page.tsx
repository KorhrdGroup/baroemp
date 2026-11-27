import { redirect } from "next/navigation";

/*
  자기소개서 목록은 이력서 · 자기소개서 첫 화면(/resume)의 "내 자기소개서" 구역이 맡는다.
  여기에 따로 둔 목록은 같은 항목을 다른 모양(긴 줄 · 연필 아이콘)으로 보여 주고 지우기 메뉴도 없어서,
  한곳으로 보낸다. 편집 화면의 위치 줄(홈 › 자기소개서)이 이 주소를 가리킨다.
*/
export default function CoverLetterListPage() {
  redirect("/resume#cover-letters");
}
