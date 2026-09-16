import { uploadImage } from '@/lib/image-upload';
import { supabase } from '@/lib/supabase';
import type { Database, Profile, WorkoutPrefs } from '@/types/database';

export type MyProfile = Profile & { prefs: WorkoutPrefs | null };

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type PrefsInsert = Database['public']['Tables']['workout_prefs']['Insert'];

/**
 * 내 프로필 + 운동 취향을 함께 가져옵니다.
 * 아직 온보딩을 안 끝냈으면 null 이 나오고, 그걸로 온보딩 화면 진입을 판단합니다.
 */
export async function fetchMyProfile(userId: string): Promise<MyProfile | null> {
  const [profileRes, prefsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('workout_prefs').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (prefsRes.error) throw prefsRes.error;
  if (!profileRes.data) return null;

  return { ...profileRes.data, prefs: prefsRes.data };
}

export async function upsertProfile(input: ProfileInsert): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function upsertPrefs(input: PrefsInsert): Promise<WorkoutPrefs> {
  const { data, error } = await supabase
    .from('workout_prefs')
    .upsert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * 프로필 사진 업로드.
 * 경로를 avatars/<userId>/... 로 고정해야 스토리지 RLS 정책과 맞습니다.
 * 줄이기·압축·바이트 읽기의 주의사항은 lib/image-upload.ts 에 적어뒀습니다.
 */
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  return uploadImage({
    bucket: 'avatars',
    path: userId + '/avatar.jpg',
    localUri,
    // 목록에 여러 장 뜨므로 원본을 그대로 쓰지 않습니다
    maxWidth: 512,
  });
}

/** 업로드한 사진 주소를 프로필에 기록합니다 (uploadAvatar 직후에 호출) */
export async function setAvatarUrl(userId: string, avatarUrl: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);
  if (error) throw error;
}

/** 탐색 후보에서 나를 숨기기 (계정 삭제 대신 쓰는 소프트 비활성화) */
export async function setActive(userId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId);
  if (error) throw error;
}
