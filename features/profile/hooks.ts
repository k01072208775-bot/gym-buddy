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

/**
 * 프로필 사진 업로드.
 * 스토리지에 올리는 것만으로는 화면에 보이지 않으므로
 * profiles.avatar_url 갱신까지 한 번에 처리합니다.
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (localUri: string) => {
      const userId = session?.user.id;
      if (!userId) throw new Error('로그인이 필요합니다.');

      const avatarUrl = await api.uploadAvatar(userId, localUri);
      await api.setAvatarUrl(userId, avatarUrl);
      return avatarUrl;
    },
    onSuccess: () => {
      // 내 프로필뿐 아니라 남에게 보이는 목록에도 사진이 반영돼야 한다
      queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches });
    },
  });
}
