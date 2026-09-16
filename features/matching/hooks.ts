import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-client';
import type { Candidate, SwipeAction } from '@/types/database';
import * as api from './api';

export function useCandidates() {
  return useQuery({
    queryKey: queryKeys.candidates,
    queryFn: () => api.fetchCandidates(),
  });
}

export function useMatches() {
  return useQuery({
    queryKey: queryKeys.matches,
    queryFn: api.fetchMatches,
  });
}

/**
 * 좋아요 / 패스.
 * 후보 목록을 낙관적으로 먼저 줄여서 탭이 버벅이지 않게 합니다.
 */
export function useSwipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ toUser, action }: { toUser: string; action: SwipeAction }) =>
      api.swipe(toUser, action),

    onMutate: async ({ toUser }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.candidates });
      const previous = queryClient.getQueryData(queryKeys.candidates);
      queryClient.setQueryData(queryKeys.candidates, (old: Candidate[] | undefined) =>
        old?.filter((c) => c.id !== toUser)
      );
      return { previous };
    },

    onError: (_error, _vars, context) => {
      // 실패하면 원래 목록으로 되돌린다
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.candidates, context.previous);
      }
    },

    onSuccess: (result) => {
      if (result.matched) {
        queryClient.invalidateQueries({ queryKey: queryKeys.matches });
      }
    },
  });
}

export function useUnmatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.unmatch,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.matches }),
  });
}

/**
 * 누군가를 차단한 직후 호출하세요.
 * 차단한 사람은 후보 목록과 매칭 목록 양쪽에서 사라져야 하므로 둘 다 비웁니다.
 */
export function useRefreshMatching() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates }),
      queryClient.invalidateQueries({ queryKey: queryKeys.matches }),
    ]);
}
