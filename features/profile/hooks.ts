import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-client';
import { useSession } from '@/lib/session';
import * as api from './api';

/** 내 프로필. 온보딩 완료 여부 판단에도 쓰입니다. */
export function useMyProfile() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...queryKeys.myProfile, userId],
    queryFn: () => api.fetchMyProfile(userId!),
    enabled: !!userId,
  });
}

/** 프로필 + 운동 취향을 한 번에 저장 (온보딩 / 프로필 수정 공용) */
export function useSaveProfile() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (input: {
      profile: Omit<Parameters<typeof api.upsertProfile>[0], 'id'>;
      prefs: Omit<Parameters<typeof api.upsertPrefs>[0], 'user_id'>;
    }) => {
      const userId = session?.user.id;
      if (!userId) throw new Error('로그인이 필요합니다.');

      const profile = await api.upsertProfile({ ...input.profile, id: userId });
      const prefs = await api.upsertPrefs({ ...input.prefs, user_id: userId });
      return { ...profile, prefs };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates });
    },
  });
}
