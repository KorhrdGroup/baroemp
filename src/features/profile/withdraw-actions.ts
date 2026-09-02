"use server";

import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logActivityEvent } from "@/lib/activity/event-logger";

export interface WithdrawState {
  error?: string;
}

/**
 * 회원 탈퇴.
 *
 * 로그인 계정(auth.users)까지 지운다. 로그인 정보를 남겨 두면 같은 아이디로 다시 들어와
 * "탈퇴했는데 계정이 살아 있는" 상태가 된다. auth.users 를 지우면 profiles 가 따라 지워지고
 * (profiles.id → auth.users ON DELETE CASCADE), 이력서·자소서·찜·진단 같은 회원 데이터도
 * profiles 를 참조하며 함께 지워진다. 활동 로그처럼 통계로 남는 표는 회원 열만 비워진다(SET NULL).
 *
 * 지우기 전에 탈퇴 사실만 한 줄 남긴다 - 이 기록도 회원 열이 비워진 채 통계로만 남는다.
 */
export async function withdrawAction(input?: { reason?: string; detail?: string }): Promise<WithdrawState> {
  const user = await requireSessionUser();

  const admin = createAdminSupabaseClient();
  if (!admin) return { error: "지금은 탈퇴를 처리할 수 없어요. 잠시 후 다시 시도해주세요." };

  /*
    떠나는 이유는 계정과 함께 사라지면 안 된다 - 무엇을 고쳐야 하는지가 여기서만 나온다.
    활동 로그는 회원 열이 비워진 채(SET NULL) 남으므로, 누구인지는 지워지고 이유만 통계로 남는다.
  */
  await logActivityEvent({
    userId: user.id,
    eventType: "account_withdrawn",
    entityType: "career_profile",
    metadata: {
      ...(input?.reason ? { reason: input.reason } : {}),
      ...(input?.detail ? { detail: input.detail.slice(0, 300) } : {}),
    },
  }).catch(() => {});

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "탈퇴 처리에 실패했어요. 잠시 후 다시 시도해주세요." };

  // 계정이 사라졌으므로 이 브라우저의 세션 쿠키도 정리한다.
  const supabase = await createServerSupabaseClient();
  if (supabase) await supabase.auth.signOut();

  redirect("/?withdrawn=1");
}
