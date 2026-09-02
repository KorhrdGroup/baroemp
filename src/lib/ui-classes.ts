/**
 * 여러 화면이 함께 쓰는 클래스 묶음.
 * 같은 역할의 요소가 파일마다 조금씩 다르게 반응하는 걸 막는다.
 */

/**
 * 눌러서 다른 화면으로 넘어가는 카드의 호버.
 *
 * KRDS 는 호버에서 배경색만 한 단계 진해지고 요소는 움직이지 않는다.
 * 테두리 색까지 함께 바꾸지 않는 이유는, 선택지 카드(진단 문항·지원금 조건 등)가
 * 선택된 상태를 테두리로 표시하기 때문이다. 이동용 카드까지 테두리를 물들이면
 * 두 가지가 같은 신호를 쓰게 된다.
 *
 * 배경 대비가 테두리보다 눈에 잘 띄어서 중장년 사용자에게도 유리하다.
 *
 * 색은 아주 옅은 파랑이다. 회색으로 두면 "눌러서 가는 카드"와 그냥 회색 면이
 * 같은 색으로 밝아져 무엇이 반응한 것인지 흐렸다. 브랜드 파랑의 가장 옅은 단계를
 * 더 묽혀 쓰므로 흰 카드 위에서 아주 밝게 얹힌다.
 */
export const interactiveCardClass =
  "transition-colors duration-200 ease-in-out hover:bg-brand-blue-50/60 active:bg-brand-blue-50";

/**
 * 회색 면 위에 얹힌 목록 행의 호버.
 *
 * 행 자체가 이미 slate-50 이라 카드와 같은 색을 덮으면 아무 변화도 보이지 않는다.
 * 같은 규칙을 한 단계 아래에서 적용해 대비를 만든다.
 */
export const interactiveRowClass =
  "transition-colors duration-200 ease-in-out hover:bg-slate-100 active:bg-slate-200";

/**
 * 흰 카드 안에 구분선으로만 가른 목록 행.
 *
 * 회색 상자를 겹쳐 넣으면 "카드 위의 카드"가 되어 답답하다. 행은 투명하게 두고
 * 아래 구분선으로만 가르며, 호버는 카드와 같은 옅은 파랑을 쓴다.
 * 좌우 여백은 음수 마진으로 카드 안쪽 여백까지 번지게 해, 호버 면이 글자에 딱 붙지 않는다.
 */
export const listRowClass =
  "-mx-2 flex items-center justify-between gap-3 rounded-lg border-b border-slate-100 px-2 py-3 last:border-b-0 " +
  interactiveCardClass;

/**
 * 테두리 대신 그림자로 띄우는 카드.
 *
 * x·y 를 0 으로 두어 어느 방향으로도 치우치지 않게 하고, 음수 spread 로
 * 번지는 범위를 좁힌다. 프로젝트에서 이미 쓰던 rgba(15,23,42,0.18) 계열을
 * 그대로 따르되 투명도만 0.10 으로 낮춰 은은하게 뒀다.
 *
 * 테두리와 같이 쓸 때는 테두리를 아주 옅게 잡는다. 둘 다 진하면 경계가
 * 두 겹으로 보인다.
 */
export const cardShadowClass = "shadow-[0_0_16px_-8px_rgba(15,23,42,0.10)]";

/**
 * 카드 테두리의 평상시 모양.
 *
 * 눈에 거의 걸리지 않는 회색으로 경계만 잡는다. 두께를 2px 로 잡아두는 건
 * 호버에서 색만 바꾸기 위해서다(outlinedCardClass 참고). 호버가 없는 카드도
 * 같은 두께를 써야 화면끼리 테두리가 달라 보이지 않는다.
 */
export const cardBorderClass = "border-2 border-slate-100";

/**
 * 눌러서 이동하는 카드의 테두리.
 *
 * 쉴 때도 2px 을 유지하고 색만 바꾼다. 1px -> 2px 로 두께를 키우면 호버할
 * 때마다 안쪽 내용이 1px 씩 밀려 카드가 들썩인다.
 * 호버하면 옅은 파랑으로 또렷해진다. 팔레트 규칙대로 blue-300 을 쓴다
 * (남색은 700~900, 파랑은 400/300).
 *
 * 눌러도 아무 일 없는 카드에는 쓰지 않는다. 안에 든 버튼만 누를 수 있는데
 * 카드 전체가 반응하면 어디를 눌러야 하는지 헷갈린다. 그런 카드는
 * cardBorderClass 만 쓴다.
 */
export const outlinedCardClass = `${cardBorderClass} hover:border-brand-blue-300`;

/**
 * 목록 위에 놓이는 필터·탭 pill.
 *
 * 파랑은 팔레트 규칙대로 400/300 단계만 쓴다(남색은 700~900). 500은 팔레트에 없는 단계라
 * 같은 화면 안에서도 버튼마다 파랑 톤이 달라 보이는 원인이었다.
 * 꺼진 상태의 테두리는 다른 카드와 같은 border-border 를 쓴다.
 */
export const filterPillClass = "shrink-0 rounded-lg border px-4 py-2 text-label-1 transition-colors";
export const filterPillOnClass = "border-brand-blue-300 bg-brand-blue-50 font-semibold text-brand-blue-600";
export const filterPillOffClass = "border-border bg-white font-medium text-slate-600 hover:bg-slate-50";

/**
 * 색 있는 바탕 위에 놓는 필터 칩의 켜진 상태.
 * 연한 파랑(filterPillOnClass)은 파란 판 위에서 배경과 같은 색이라 켜졌는지 안 보인다.
 */
export const filterPillOnSolidClass = "border-brand-blue-400 bg-brand-blue-400 font-semibold text-white";

/**
 * 섹션 제목 옆의 개수. "내 이력서 (6)" 처럼 괄호로 묶지 않고 숫자만 붙인다.
 * 개수는 제목이 아니라 제목에 딸린 값이므로, 두께를 한 단계 낮추고 회색으로 물린다.
 */
export const sectionCountClass = "ml-2 font-semibold text-slate-500";
