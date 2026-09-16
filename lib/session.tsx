import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

/**
 * 로그인 세션은 특정 기능이 아니라 앱 전체가 쓰는 인프라라서 lib 에 둡니다.
 * (features/matching 이 features/auth 를 import 하기 시작하면 의존성이 엉킵니다)
 */

type SessionState = {
  session: Session | null;
  /** 저장된 세션을 아직 복원하는 중 */
  loading: boolean;
};

const SessionContext = createContext<SessionState>({ session: null, loading: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ session: null, loading: true });

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setState({ session: data.session, loading: false });
    });

    // 로그인 / 로그아웃 / 토큰 갱신을 여기서 한 번에 받는다
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false });
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

/** 컴포넌트 밖(api 함수 안)에서 현재 사용자 id 가 필요할 때 */
export async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('로그인이 필요합니다.');
  return data.user.id;
}
