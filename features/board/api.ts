import { getCurrentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { BoardType, CommentItem, PostItem, TradeStatus } from '@/types/database';

export const POSTS_PAGE_SIZE = 20;

export type PostInput = {
  board: BoardType;
  title: string;
  body: string;
  /** 장터게시판만. 다른 게시판은 null */
  price: number | null;
  /** 운동게시판만. 다른 게시판은 null */
  sport: string | null;
};

/**
 * 글 목록. 같은 학교 / 차단 제외 필터는 전부 DB의 get_posts 안에 있습니다.
 * sport 가 null 이면 전체 종목, beforeId 를 넘기면 그보다 오래된 글을 이어서 가져옵니다.
 */
export async function fetchPosts(
  board: BoardType,
  sport: string | null,
  beforeId?: number
): Promise<PostItem[]> {
  const { data, error } = await supabase.rpc('get_posts', {
    board_filter: board,
    sport_filter: sport ?? undefined,
    before_id: beforeId,
    limit_count: POSTS_PAGE_SIZE,
  });
  if (error) throw error;
  return data ?? [];
}

/** 글 하나. 지워졌거나 볼 수 없는 글(다른 학교·차단)이면 null */
export async function fetchPost(postId: number): Promise<PostItem | null> {
  const { data, error } = await supabase.rpc('get_post', { p_post_id: postId });
  if (error) throw error;
  return data?.[0] ?? null;
}

/** @returns 새 글의 id */
export async function createPost(input: PostInput): Promise<number> {
  const me = await getCurrentUserId();
  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: me,
      board: input.board,
      title: input.title.trim(),
      body: input.body.trim(),
      price: input.board === 'market' ? input.price : null,
      sport: input.board === 'workout' ? input.sport : null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/** 게시판 종류는 바꿀 수 없습니다 (DB 트리거가 무시) */
export async function updatePost(postId: number, input: PostInput): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({
      title: input.title.trim(),
      body: input.body.trim(),
      price: input.board === 'market' ? input.price : null,
      sport: input.board === 'workout' ? input.sport : null,
    })
    .eq('id', postId);
  if (error) throw error;
}

export async function deletePost(postId: number): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

/** 장터 거래 상태 변경 (판매중 / 예약중 / 판매완료) */
export async function setTradeStatus(postId: number, status: TradeStatus): Promise<void> {
  const { error } = await supabase.from('posts').update({ trade_status: status }).eq('id', postId);
  if (error) throw error;
}

/** 좋아요 수는 DB 트리거가 올리고 내리므로 여기서는 기록만 넣고 뺍니다 */
export async function setLiked(postId: number, liked: boolean): Promise<void> {
  const me = await getCurrentUserId();

  if (liked) {
    const { error } = await supabase
      .from('post_likes')
      .upsert({ post_id: postId, user_id: me }, { onConflict: 'post_id,user_id', ignoreDuplicates: true });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', me);
    if (error) throw error;
  }
}

export async function fetchComments(postId: number): Promise<CommentItem[]> {
  const { data, error } = await supabase.rpc('get_comments', { p_post_id: postId });
  if (error) throw error;
  return data ?? [];
}

export async function addComment(postId: number, body: string): Promise<void> {
  const me = await getCurrentUserId();
  const { error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, author_id: me, body: body.trim() });
  if (error) throw error;
}

export async function deleteComment(commentId: number): Promise<void> {
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
  if (error) throw error;
}
