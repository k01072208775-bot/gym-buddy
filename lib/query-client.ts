import { QueryClient } from '@tanstack/react-query';

import type { BoardType } from '@/types/database';

/**
 * 서버 데이터 캐시. 화면에서 useState + useEffect 로 직접 fetch 하지 말고
 * features/<기능>/hooks.ts 의 useQuery / useMutation 을 쓰세요.
 * 로딩·에러·재시도·캐시 무효화를 한 곳에서 관리할 수 있습니다.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** 쿼리 키를 문자열로 흩뿌리지 않고 여기서만 만든다 (오타 방지) */
export const queryKeys = {
  myProfile: ['my-profile'] as const,
  candidates: ['candidates'] as const,
  matches: ['matches'] as const,
  likesReceived: ['likes-received'] as const,
  messages: (matchId: number) => ['messages', matchId] as const,
  allPosts: ['posts'] as const,
  posts: (board: BoardType, sport: string | null = null) =>
    ['posts', board, sport ?? 'all'] as const,
  post: (postId: number) => ['post', postId] as const,
  comments: (postId: number) => ['comments', postId] as const,
};
