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
 * 색은 KRDS 가 흰 표면 호버에 쓰는 회색 5→10 단계에 맞췄다.
 * (KRDS gray-5 #F8F8F8 / gray-10 #F0F0F0, 이 프로젝트의 slate-50/100 과 거의 같다)
 */
export const interactiveCardClass =
  "transition-colors duration-200 ease-in-out hover:bg-slate-50 active:bg-slate-100";

/**
 * 회색 면 위에 얹힌 목록 행의 호버.
 *
 * 행 자체가 이미 slate-50 이라 카드와 같은 색을 덮으면 아무 변화도 보이지 않는다.
 * 같은 규칙을 한 단계 아래에서 적용해 대비를 만든다.
 */
export const interactiveRowClass =
  "transition-colors duration-200 ease-in-out hover:bg-slate-100 active:bg-slate-200";
