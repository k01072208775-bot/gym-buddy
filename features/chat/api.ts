import { getCurrentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types/database';

/** 대화방을 열었을 때 읽음으로 표시 (0009_message_reads.sql) */
export async function markMatchRead(matchId: number): Promise<void> {
  const { error } = await supabase.rpc('mark_match_read', { p_match_id: matchId });
  if (error) throw error;
}

export async function fetchMessages(matchId: number): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return data;
}

export async function sendMessage(matchId: number, body: string): Promise<Message> {
  const me = await getCurrentUserId();
  const { data, error } = await supabase
    .from('messages')
    .insert({ match_id: matchId, sender_id: me, body: body.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * 실시간 수신.
 * 0001_init.sql 의 8번 블록에서 messages 테이블을 realtime publication 에
 * 추가해야 동작합니다.
 *
 * @returns 구독 해제 함수 — useEffect 의 cleanup 에서 반드시 호출하세요.
 */
export function subscribeToMessages(
  matchId: number,
  onInsert: (message: Message) => void
): () => void {
  const channel = supabase
    .channel(`messages:${matchId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => onInsert(payload.new as Message)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
