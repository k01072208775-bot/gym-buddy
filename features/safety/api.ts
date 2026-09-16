import { getCurrentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

/**
 * 신고 · 차단.
 *
 * ★ 이 기능은 있으면 좋은 게 아니라 없으면 스토어 심사에서 리젝됩니다.
 *   (Apple App Review Guideline 1.2 — 사용자 생성 콘텐츠가 있는 앱의 필수 요건)
 *   나중에 붙이지 말고 프로필 화면·채팅 화면에 처음부터 넣어두세요.
 */

/** 차단하면 서로의 탐색 후보·프로필·메시지에서 즉시 사라집니다 (RLS가 처리) */
export async function blockUser(targetId: string): Promise<void> {
  const me = await getCurrentUserId();
  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: me, blocked_id: targetId });
  if (error) throw error;
}

export async function unblockUser(targetId: string): Promise<void> {
  const me = await getCurrentUserId();
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', me)
    .eq('blocked_id', targetId);
  if (error) throw error;
}

export async function fetchBlockedIds(): Promise<string[]> {
  const { data, error } = await supabase.from('blocks').select('blocked_id');
  if (error) throw error;
  return data.map((row) => row.blocked_id);
}

/**
 * 신고 접수. 접수 후 24시간 안에 처리해야 하므로
 * Supabase 대시보드에서 reports 테이블(status='pending')을 매일 확인하세요.
 */
export type ReportInput = {
  /** 신고당하는 사용자 (게시글·댓글이면 작성자) */
  targetId: string;
  reason: string;
  detail?: string;
  /** 게시글을 신고할 때 */
  postId?: number;
  /** 댓글을 신고할 때 */
  commentId?: number;
};

export async function reportUser(input: ReportInput): Promise<void> {
  const me = await getCurrentUserId();
  const { error } = await supabase.from('reports').insert({
    reporter_id: me,
    target_id: input.targetId,
    reason: input.reason,
    detail: input.detail ?? null,
    post_id: input.postId ?? null,
    comment_id: input.commentId ?? null,
  });
  if (error) throw error;
}

/** 신고와 차단은 보통 한 번에 일어납니다 */
export async function reportAndBlock(input: ReportInput): Promise<void> {
  await reportUser(input);
  await blockUser(input.targetId);
}
