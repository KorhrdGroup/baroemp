import type { Region } from "@/types";

/**
 * 시·군·구 이름 -> 광역 코드.
 *
 * 광역 키워드만 훑으면 두 가지가 어긋난다.
 *   - "해운대구" 안에 "대구" 가 들어 있어 부산 공고가 대구로 갔다(실제로 869건이 그랬다).
 *   - "용산구시설관리공단" 처럼 광역 이름 없이 기초 이름만 있는 기관은 지역을 못 찾았다.
 * 그래서 광역 키워드보다 이 표를 먼저 본다.
 *
 * 여러 광역에 같은 이름이 있는 것(중구·동구·서구·남구·북구·강서구·고성군)은 넣지 않는다.
 * 그런 기관은 대개 "부산광역시 동구" 처럼 광역이 앞에 붙어 있어 다음 단계에서 걸린다.
 * 경기도 광주시도 넣지 않는다 - "광주" 만 보고 광주광역시와 섞이기 때문이다.
 */
export const SIGUNGU_REGION: Record<string, Region> = {
  강남구: "seoul", 강동구: "seoul", 강북구: "seoul", 관악구: "seoul", 광진구: "seoul", 구로구: "seoul", 금천구: "seoul", 노원구: "seoul", 도봉구: "seoul", 동대문구: "seoul", 동작구: "seoul", 마포구: "seoul", 서대문구: "seoul", 서초구: "seoul", 성동구: "seoul", 성북구: "seoul", 송파구: "seoul", 양천구: "seoul", 영등포구: "seoul", 용산구: "seoul", 은평구: "seoul", 종로구: "seoul", 중랑구: "seoul",
  가평군: "gyeonggi", 고양시: "gyeonggi", 과천시: "gyeonggi", 광명시: "gyeonggi", 구리시: "gyeonggi", 군포시: "gyeonggi", 김포시: "gyeonggi", 남양주시: "gyeonggi", 동두천시: "gyeonggi", 부천시: "gyeonggi", 성남시: "gyeonggi", 수원시: "gyeonggi", 시흥시: "gyeonggi", 안산시: "gyeonggi", 안성시: "gyeonggi", 안양시: "gyeonggi", 양주시: "gyeonggi", 양평군: "gyeonggi", 여주시: "gyeonggi", 연천군: "gyeonggi", 오산시: "gyeonggi", 용인시: "gyeonggi", 의왕시: "gyeonggi", 의정부시: "gyeonggi", 이천시: "gyeonggi", 파주시: "gyeonggi", 평택시: "gyeonggi", 포천시: "gyeonggi", 하남시: "gyeonggi", 화성시: "gyeonggi",
  강화군: "incheon", 검단구: "incheon", 계양구: "incheon", 남동구: "incheon", 미추홀구: "incheon", 부평구: "incheon", 서해구: "incheon", 연수구: "incheon", 영종구: "incheon", 옹진군: "incheon", 제물포구: "incheon",
  강릉시: "gangwon", 동해시: "gangwon", 삼척시: "gangwon", 속초시: "gangwon", 양구군: "gangwon", 양양군: "gangwon", 영월군: "gangwon", 원주시: "gangwon", 인제군: "gangwon", 정선군: "gangwon", 철원군: "gangwon", 춘천시: "gangwon", 태백시: "gangwon", 평창군: "gangwon", 홍천군: "gangwon", 화천군: "gangwon", 횡성군: "gangwon",
  괴산군: "chungbuk", 단양군: "chungbuk", 보은군: "chungbuk", 영동군: "chungbuk", 옥천군: "chungbuk", 음성군: "chungbuk", 제천시: "chungbuk", 증평군: "chungbuk", 진천군: "chungbuk", 청주시: "chungbuk", 충주시: "chungbuk",
  계룡시: "chungnam", 공주시: "chungnam", 금산군: "chungnam", 논산시: "chungnam", 당진시: "chungnam", 보령시: "chungnam", 부여군: "chungnam", 서산시: "chungnam", 서천군: "chungnam", 아산시: "chungnam", 예산군: "chungnam", 천안시: "chungnam", 청양군: "chungnam", 태안군: "chungnam", 홍성군: "chungnam",
  대덕구: "daejeon", 유성구: "daejeon",
  고창군: "jeonbuk", 군산시: "jeonbuk", 김제시: "jeonbuk", 남원시: "jeonbuk", 무주군: "jeonbuk", 부안군: "jeonbuk", 순창군: "jeonbuk", 완주군: "jeonbuk", 익산시: "jeonbuk", 임실군: "jeonbuk", 장수군: "jeonbuk", 전주시: "jeonbuk", 정읍시: "jeonbuk", 진안군: "jeonbuk",
  강진군: "jeonnam", 고흥군: "jeonnam", 곡성군: "jeonnam", 광양시: "jeonnam", 구례군: "jeonnam", 나주시: "jeonnam", 담양군: "jeonnam", 목포시: "jeonnam", 무안군: "jeonnam", 보성군: "jeonnam", 순천시: "jeonnam", 신안군: "jeonnam", 여수시: "jeonnam", 영광군: "jeonnam", 영암군: "jeonnam", 완도군: "jeonnam", 장성군: "jeonnam", 장흥군: "jeonnam", 진도군: "jeonnam", 함평군: "jeonnam", 해남군: "jeonnam", 화순군: "jeonnam",
  광산구: "gwangju",
  경산시: "gyeongbuk", 경주시: "gyeongbuk", 고령군: "gyeongbuk", 구미시: "gyeongbuk", 김천시: "gyeongbuk", 문경시: "gyeongbuk", 봉화군: "gyeongbuk", 상주시: "gyeongbuk", 성주군: "gyeongbuk", 안동시: "gyeongbuk", 영덕군: "gyeongbuk", 영양군: "gyeongbuk", 영주시: "gyeongbuk", 영천시: "gyeongbuk", 예천군: "gyeongbuk", 울릉군: "gyeongbuk", 울진군: "gyeongbuk", 의성군: "gyeongbuk", 청도군: "gyeongbuk", 청송군: "gyeongbuk", 칠곡군: "gyeongbuk", 포항시: "gyeongbuk",
  거제시: "gyeongnam", 거창군: "gyeongnam", 김해시: "gyeongnam", 남해군: "gyeongnam", 밀양시: "gyeongnam", 사천시: "gyeongnam", 산청군: "gyeongnam", 양산시: "gyeongnam", 의령군: "gyeongnam", 진주시: "gyeongnam", 창녕군: "gyeongnam", 창원시: "gyeongnam", 통영시: "gyeongnam", 하동군: "gyeongnam", 함안군: "gyeongnam", 함양군: "gyeongnam", 합천군: "gyeongnam",
  군위군: "daegu", 달서구: "daegu", 달성군: "daegu", 수성구: "daegu",
  울주군: "ulsan",
  금정구: "busan", 기장군: "busan", 동래구: "busan", 부산진구: "busan", 사상구: "busan", 사하구: "busan", 수영구: "busan", 연제구: "busan", 영도구: "busan", 해운대구: "busan",
  서귀포시: "jeju", 제주시: "jeju",
};

/*
  이름은 두 가지 꼴로 들어온다.
    "부산 해운대구", "서울특별시 광진구"  - 시·군·구 이름이 그대로 들어 있다.
    "청주도시공사", "천안복지재단"        - "시" 를 떼고 기관 이름에 붙여 쓴다.

  앞의 것은 문자열 어디에 있든 찾는다. 구·시·군 까지 붙은 이름이라 다른 말에 우연히
  들어가기 어렵다. 뒤의 것은 맨 앞에서만 찾는다 - "한국환**경산**업기술원" 처럼 낱말
  가운데에 지역 이름이 숨어 있는 경우를 지역으로 오인하기 때문이다.
*/
const FULL_NAMES = Object.entries(SIGUNGU_REGION).sort((a, b) => b[0].length - a[0].length);

const STEMS = Object.entries(SIGUNGU_REGION)
  .filter(([name]) => name.endsWith("시") || name.endsWith("군"))
  .map(([name, region]) => [name.slice(0, -1), region] as [string, Region])
  .sort((a, b) => b[0].length - a[0].length);

/** 기관 이름 앞에 붙는 법인격. 떼고 나서 맨 앞을 본다. */
const LEGAL_PREFIX = /^(\(재\)|\(사\)|재단법인|사단법인|학교법인|주식회사|농업회사법인)\s*/;

/** 이 텍스트에 시·군·구 이름이 들어 있으면 그 광역 코드. 없으면 undefined. */
export function guessRegionFromSigungu(text: string): Region | undefined {
  const full = FULL_NAMES.find(([name]) => text.includes(name));
  if (full) return full[1];

  const head = text.replace(LEGAL_PREFIX, "");
  return STEMS.find(([stem]) => head.startsWith(stem))?.[1];
}
