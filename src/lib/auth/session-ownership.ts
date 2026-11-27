import "server-only";
import { cookies } from "next/headers";
import { getCurrentUser } from "./session";

/** 진단(직업진단 · 지원금 진단) 세션이나 결과의 주인 표시. */
interface OwnedRecord {
  userId?: string | null;
  anonymousId?: string | null;
}

/**
 * 지금 요청을 보낸 사람이 이 진단의 주인인지 본다.
 *
 * 진단 결과 · 진행 화면과 답변 저장은 주소의 세션 번호만으로 불러와, 번호를 알면 남의 진단을 보거나 고칠 수 있었다.
 * - 회원 진단(userId 있음): 로그인한 본인만.
 * - 비회원 진단(userId 없음): 같은 브라우저의 비회원 번호(baro_anonymous_id)만. 로그인한 뒤에도 같은 브라우저면 이어서 볼 수 있다.
 * clientAnonymousId 는 화면이 넘긴 비회원 번호(localStorage). 쿠키와 둘 중 하나만 맞으면 된다.
 */
export async function isSessionOwner(record: OwnedRecord, clientAnonymousId?: string): Promise<boolean> {
  if (record.userId) {
    const user = await getCurrentUser();
    return user?.id === record.userId;
  }
  if (!record.anonymousId) return false;
  const cookieAnonymousId = (await cookies()).get("baro_anonymous_id")?.value;
  return record.anonymousId === cookieAnonymousId || record.anonymousId === clientAnonymousId;
}
