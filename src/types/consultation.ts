import type { ISODateString } from "./common";

/**
 * Consultation: 1:1 취업컨설팅 상담 도메인.
 */
export type ConsultationChannel = "phone" | "video" | "in_person" | "chat";

export type ConsultationStatus =
  | "requested"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Consultation {
  id: string;
  userId: string;
  channel: ConsultationChannel;
  status: ConsultationStatus;

  requestedTopic?: string;
  preferredAt?: ISODateString;
  scheduledAt?: ISODateString;
  completedAt?: ISODateString;

  assignedConsultantName?: string;
  memo?: string;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}
