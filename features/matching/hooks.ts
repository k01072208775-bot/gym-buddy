import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-client';
import { useSession } from '@/lib/session';
import type { Candidate, LikeReceived, SwipeAction } from '@/types/database';
import * as api from './api';

export function useCandidates() {
  return useQuery({
    queryKey: queryKeys.candidates,
    queryFn: () => api.fetchCandidates(),
  });
}

/**
 * 받은 관심. 푸시 알림이 아직 없어서, 앱이 켜져 있는 동안 30초마다 새로 확인해
 * 매칭 탭 배지를 갱신합니다.
 */
export function useLikesReceived() {
  const { session } = useSession();
  return useQuery({
    queryKey: queryKeys.likesReceived,
    queryFn: api.fetchLikesReceived,
    refetchInterval: 30_000,
    // 로그아웃 상태에서 30초마다 서버에 묻지 않도록
    enabled: !!session,
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
 * 후보 목록과 받은 관심 목록을 낙관적으로 먼저 줄여서 탭이 버벅이지 않게 합니다.
 * (버튼을 두 번 눌러 같은 기록이 중복으로 들어가는 것도 막습니다)
 */
export function useSwipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ toUser, action }: { toUser: string; action: SwipeAction }) =>
      api.swipe(toUser, action),

    onMutate: async ({ toUser }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.candidates }),
        queryClient.cancelQueries({ queryKey: queryKeys.likesReceived }),
      ]);
      const previous = queryClient.getQueryData(queryKeys.candidates);
      const previousLikes = queryClient.getQueryData(queryKeys.likesReceived);
      queryClient.setQueryData(queryKeys.candidates, (old: Candidate[] | undefined) =>
        old?.filter((c) => c.id !== toUser)
      );
      queryClient.setQueryData(queryKeys.likesReceived, (old: LikeReceived[] | undefined) =>
        old?.filter((c) => c.id !== toUser)
      );
      return { previous, previousLikes };
    },

    onError: (_error, _vars, context) => {
      // 실패하면 원래 목록으로 되돌린다
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.candidates, context.previous);
      }
      if (context?.previousLikes) {
        queryClient.setQueryData(queryKeys.likesReceived, context.previousLikes);
      }
    },

    onSuccess: (result) => {
      // 받은 관심에서 수락·거절했다면 그 사람을 목록에서 빼야 한다
      queryClient.invalidateQueries({ queryKey: queryKeys.likesReceived });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.likesReceived }),
    ]);
}
