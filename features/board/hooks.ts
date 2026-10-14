import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-client';
import type { BoardType, PostItem, TradeStatus } from '@/types/database';
import * as api from './api';

/** 게시판 글 목록 (아래로 스크롤하면 20개씩 더 불러옴). sport 가 null 이면 전체 종목 */
export function usePosts(board: BoardType, sport: string | null = null) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts(board, sport),
    queryFn: ({ pageParam }) => api.fetchPosts(board, sport, pageParam ?? undefined),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) =>
      lastPage.length < api.POSTS_PAGE_SIZE ? null : lastPage[lastPage.length - 1].id,
  });
}

/** postId 가 null 이면 불러오지 않습니다 (글쓰기 화면에서 새 글일 때) */
export function usePost(postId: number | null) {
  return useQuery({
    queryKey: queryKeys.post(postId ?? -1),
    queryFn: () => api.fetchPost(postId!),
    enabled: postId !== null && Number.isFinite(postId),
  });
}

export function useComments(postId: number) {
  return useQuery({
    queryKey: queryKeys.comments(postId),
    queryFn: () => api.fetchComments(postId),
    enabled: Number.isFinite(postId),
  });
}

/** 새 글이면 postId 를 null 로. 성공하면 글 id 를 돌려줍니다. */
export function useSavePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, input }: { postId: number | null; input: api.PostInput }) => {
      if (postId === null) return api.createPost(input);
      await api.updatePost(postId, input);
      return postId;
    },
    onSuccess: (postId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allPosts });
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deletePost,
    onSuccess: (_result, postId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allPosts });
      queryClient.removeQueries({ queryKey: queryKeys.post(postId) });
    },
  });
}

export function useSetTradeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, status }: { postId: number; status: TradeStatus }) =>
      api.setTradeStatus(postId, status),
    onSuccess: (_result, { postId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts('market') });
    },
  });
}

/**
 * 좋아요 / 취소.
 * 하트가 바로 바뀌도록 화면의 숫자를 먼저 고치고, 실패하면 되돌립니다.
 */
export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, liked }: { postId: number; liked: boolean }) =>
      api.setLiked(postId, liked),

    onMutate: async ({ postId, liked }) => {
      const key = queryKeys.post(postId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PostItem | null>(key);
      queryClient.setQueryData(key, (old: PostItem | null | undefined) =>
        old ? { ...old, liked_by_me: liked, like_count: old.like_count + (liked ? 1 : -1) } : old
      );
      return { previous };
    },

    onError: (_error, { postId }, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.post(postId), context.previous);
      }
    },

    onSettled: (_result, _error, { postId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allPosts });
    },
  });
}

/** 모집글 참여자 명단 */
export function useParticipants(postId: number) {
  return useQuery({
    queryKey: queryKeys.participants(postId),
    queryFn: () => api.fetchParticipants(postId),
    enabled: Number.isFinite(postId),
  });
}

/**
 * 모집글 참여 / 참여 취소.
 * 좋아요와 같은 방식으로, 눌린 즉시 화면을 먼저 바꾸고 서버에 보냅니다.
 * 정원이 찼거나 내 글이면 DB 가 거부하고, 그때 화면이 원래대로 돌아옵니다.
 */
export function useToggleJoin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, joined }: { postId: number; joined: boolean }) =>
      api.setJoined(postId, joined),

    onMutate: async ({ postId, joined }) => {
      const key = queryKeys.post(postId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PostItem | null>(key);
      queryClient.setQueryData(key, (old: PostItem | null | undefined) =>
        old
          ? {
              ...old,
              joined_by_me: joined,
              participant_count: Math.max(old.participant_count + (joined ? 1 : -1), 0),
            }
          : old
      );
      return { previous };
    },

    onError: (_error, { postId }, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.post(postId), context.previous);
      }
    },

    onSettled: (_result, _error, { postId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.participants(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allPosts });
    },
  });
}

export function useAddComment(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.addComment(postId, body),
    onSuccess: () => invalidatePostAndComments(queryClient, postId),
  });
}

export function useDeleteComment(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteComment,
    onSuccess: () => invalidatePostAndComments(queryClient, postId),
  });
}

/**
 * 누군가를 차단한 직후 호출하세요.
 * 차단한 사람의 글·댓글이 게시판 전체에서 사라져야 하므로 캐시를 통째로 비웁니다.
 */
export function useRefreshBoard() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.allPosts }),
      queryClient.invalidateQueries({ queryKey: ['post'] }),
      queryClient.invalidateQueries({ queryKey: ['comments'] }),
    ]);
}

function invalidatePostAndComments(queryClient: ReturnType<typeof useQueryClient>, postId: number) {
  queryClient.invalidateQueries({ queryKey: queryKeys.comments(postId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.allPosts });
}

/** 게시글 사진 업로드. 고른 즉시 올리고 글 저장 때 URL 만 함께 보냅니다. */
export function useUploadPostImage() {
  return useMutation({ mutationFn: api.uploadPostImage });
}
