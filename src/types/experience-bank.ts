import type { ISODateString } from "./common";

/**
 * Experience Bank: 사용자가 자신의 경험을 저장해두고 여러 자기소개서 문항에서 재사용하는 저장소.
 * STAR(Situation/Task/Action/Result) 구조를 사용하지만, 화면에는 전문용어를 노출하지 않고
 * "어떤 상황이었나요?" 같은 쉬운 질문으로 입력받는다 (스펙 35번).
 */
export interface ExperienceBankItem {
  id: string;
  userId: string;
  title: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  skills: string[];
  relatedOccupations: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type ExperienceBankItemInput = Partial<Omit<ExperienceBankItem, "id" | "userId" | "createdAt" | "updatedAt">> & {
  title: string;
};
