import { getCurrentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { Candidate, Profile, SwipeAction } from '@/types/database';

export type MatchWithPartner = {
  matchId: number;
  matchedAt: string;
  partner: Pick<Profile, 'id' | 'nickname' | 'university' | 'avatar_url'>;
};

/**
 * 후보 목록. 필터링·정렬 로직은 전부 DB의 get_candidates 함수 안에 있습니다.
 * 앱에서 전체 회원을 받아 걸러내면 개인정보가 그대로 새어나가므로 서버에서 잘라야 합니다.
 */
export async function fetchCandidates(limit = 20): Promise<Candidate[]> {
  const { data, error } = await supabase.rpc('get_candidates', { limit_count: limit });
  if (error) throw error;
  return data ?? [];
}

/**
 * 좋아요 / 패스 기록.
 * 서로 like 하면 DB 트리거가 matches 행을 자동으로 만들어 주므로,
 * 여기서는 기록 후 매칭이 생겼는지 확인만 합니다.
 */
export async function swipe(
  toUser: string,
  action: SwipeAction
): Promise<{ matched: boolean; matchId?: number }> {
  const me = await getCurrentUserId();

  const { error } = await supabase
    .from('swipes')
    .insert({ from_user: me, to_user: toUser, action });
  if (error) throw error;

  if (action === 'pass') return { matched: false };

  const [userA, userB] = [me, toUser].sort();
  const { data, error: matchError } = await supabase
    .from('matches')
    .select('id')
    .eq('user_a', userA)
    .eq('user_b', userB)
    .maybeSingle();
  if (matchError) throw matchError;

  return { matched: !!data, matchId: data?.id };
}

/** 성사된 매칭 목록 + 상대방 프로필 */
export async function fetchMatches(): Promise<MatchWithPartner[]> {
  const me = await getCurrentUserId();

  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, user_a, user_b, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!matches?.length) return [];

  const partnerIds = matches.map((m) => (m.user_a === me ? m.user_b : m.user_a));

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, nickname, university, avatar_url')
    .in('id', partnerIds);
  if (profileError) throw profileError;

  const byId = new Map(profiles.map((p) => [p.id, p]));

  return matches.flatMap((m) => {
    const partner = byId.get(m.user_a === me ? m.user_b : m.user_a);
    // 상대가 탈퇴했거나 차단되어 RLS에 걸린 경우 목록에서 제외
    if (!partner) return [];
    return [{ matchId: m.id, matchedAt: m.created_at, partner }];
  });
}

/** 매칭 해제 */
export async function unmatch(matchId: number): Promise<void> {
  const { error } = await supabase.from('matches').delete().eq('id', matchId);
  if (error) throw error;
}
