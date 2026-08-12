import type { ISODateString, Tag } from "./common";

/**
 * Employment Destination: 같은 직업(Occupation)이라도 취업처에 따라 채용시장 요구조건이
 * 달라질 수 있다는 전제로 만든 도메인 (STEP 7.5 스펙 4번).
 * 예: 사회복지사 -> 재가복지센터 / 요양원 / 주야간보호센터 ...
 *
 * 특정 직업명을 코드에 하드코딩하지 않기 위해 관리자가 자유롭게 추가/수정할 수 있는 구조로 둔다.
 */
export interface EmploymentDestination {
  id: string;
  occupationId: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  tags: Tag[];
  /** Job -> Destination 분류(Rule/Keyword 기반, 스펙 5번)에 사용하는 키워드 목록 */
  classifierKeywords: string[];
  status: "active" | "inactive";
  orderIndex: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type EmploymentDestinationInput = Partial<Omit<EmploymentDestination, "id" | "createdAt" | "updatedAt">> & {
  occupationId: string;
  name: string;
  slug: string;
};

export type EmploymentDestinationFilter = {
  occupationId?: string;
  status?: EmploymentDestination["status"];
};
