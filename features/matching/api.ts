import { getCurrentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { Candidate, LikeReceived, Profile, SwipeAction } from '@/types/database';

export type MatchWithPartner = {
  matchId: number;
  matchedAt: string;
  partner: Pick<Profile, 'id' | 'nickname' | 'university' | 'avatar_url'>;
  /** 아직 대화가 없으면 null */
  lastMessage: { body: string; at: string; isMine: boolean } | null;
  /** 내가 아직 안 읽은 상대 메시지 수 */
  unreadCount: number;
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

/**
 * 나에게 '같이 운동해요'를 보낸 사람 중 아직 답하지 않은 사람.
 * 수락은 swipe(id, 'like'), 거절은 swipe(id, 'pass') 로 그대로 처리됩니다.
 * 누가 나를 pass 했는지는 DB 가 절대 돌려주지 않습니다 (0006_likes_received.sql).
 */
export async function fetchLikesReceived(): Promise<LikeReceived[]> {
  const { data, error } = await supabase.rpc('get_likes_received', {});
  if (error) throw error;
  return data ?? [];
}

/**
 * 성사된 매칭 목록 + 상대방 프로필 + 마지막 메시지 + 안 읽은 개수.
 * 전에는 matches 와 profiles 를 따로 불러 앱에서 합쳤는데, 대화 정보까지
 * 넣으면 대화방 수만큼 요청이 늘어나므로 DB 함수 하나로 받습니다
 * (0009_message_reads.sql). 최근 대화가 있는 방이 위로 옵니다.
 */
export async function fetchMatches(): Promise<MatchWithPartner[]> {
  const { data, error } = await supabase.rpc('get_matches', {});
  if (error) throw error;

  return (data ?? []).map((row) => ({
    matchId: row.match_id,
    matchedAt: row.matched_at,
    partner: {
      id: row.partner_id,
      nickname: row.partner_nickname,
      university: row.partner_university,
      avatar_url: row.partner_avatar_url,
    },
    lastMessage:
      row.last_message === null
        ? null
        : {
            body: row.last_message,
            at: row.last_message_at!,
            isMine: row.last_message_is_mine!,
          },
    unreadCount: row.unread_count,
  }));
}

/** 매칭 해제 */
export async function unmatch(matchId: number): Promise<void> {
  const { error } = await supabase.from('matches').delete().eq('id', matchId);
  if (error) throw error;
}
