"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

/**
 * 서버가 그린 로그인 상태와 브라우저의 실제 세션이 어긋나면 화면을 다시 받아온다.
 *
 * 헤더는 (site) 레이아웃에서 서버가 세션을 보고 그리는데, 소프트 내비게이션은 바뀐 페이지 조각만
 * 받아오고 레이아웃은 그대로 둔다. 그래서 세션이 만료된 뒤 "마이페이지"를 누르면 /login 으로
 * 보내지면서도 헤더에는 "마이페이지 · 로그아웃"이 남아 있었다. 다른 탭에서 로그아웃·로그인한
 * 경우도 같다.
 *
 * 레이아웃에서 서버가 본 상태(serverHasUser)를 받아, 브라우저 세션과 다르면 router.refresh() 로
 * 레이아웃까지 다시 그린다. 새로 그려진 레이아웃이 다시 이 컴포넌트를 마운트하며 값이 맞춰진다.
 */

/**
 * 내비게이션이 주소 정리까지 끝낸 뒤에 refresh 를 건다.
 * 리다이렉트 직후 곧바로 걸면 라우터가 아직 정리 중이던 내부 주소(_rsc=…)가 주소창에 남았다.
 */
const SETTLE_MS = 300;

export function SessionSync({ serverHasUser }: { serverHasUser: boolean }) {
  const router = useRouter();
  // 경로가 바뀔 때마다 다시 확인한다. 세션이 끊긴 채 페이지를 옮겨 다니는 경우를 잡는다.
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return; // Mock Mode: 가짜 세션 쿠키라 브라우저에서 확인할 것이 없다.

    let cancelled = false;
    let pending: number | undefined;
    const syncIfChanged = (hasSession: boolean) => {
      if (hasSession === serverHasUser) return;
      window.clearTimeout(pending);
      pending = window.setTimeout(() => {
        if (!cancelled) router.refresh();
      }, SETTLE_MS);
    };

    const initial = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data }) => syncIfChanged(Boolean(data.session)));
    }, SETTLE_MS);

    // 다른 탭에서 로그인·로그아웃하거나 세션이 끊긴 순간도 잡는다.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") syncIfChanged(Boolean(session));
    });

    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearTimeout(pending);
      subscription.unsubscribe();
    };
  }, [router, serverHasUser, pathname]);

  return null;
}
