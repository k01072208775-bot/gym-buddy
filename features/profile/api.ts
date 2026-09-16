import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';
import type { Database, Profile, WorkoutPrefs } from '@/types/database';

export type MyProfile = Profile & { prefs: WorkoutPrefs | null };

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type PrefsInsert = Database['public']['Tables']['workout_prefs']['Insert'];

/** 프로필 사진의 가로 최대 길이(px). 목록에 여러 장 뜨므로 원본을 그대로 쓰지 않습니다. */
const AVATAR_WIDTH = 512;

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
 * 사진첩에서 고른 원본을 업로드용으로 줄입니다.
 *
 * 압축을 이미지 선택기의 quality 옵션에 맡기면 안 됩니다.
 * 그 옵션은 JPEG 에만 먹어서, PNG 로 나오는 안드로이드에서는
 * 1.4MB 짜리 원본이 그대로 올라갔습니다. 여기서 형식까지 JPEG 로 고정합니다.
 */
async function toUploadableJpeg(localUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(localUri);
  // height 를 주지 않으면 비율을 유지하므로 정사각형이 아니어도 찌그러지지 않습니다
  context.resize({ width: AVATAR_WIDTH });

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
  return saved.uri;
}

/**
 * 프로필 사진 업로드.
 * 경로를 avatars/<userId>/... 로 고정해야 스토리지 RLS 정책과 맞습니다.
 *
 * ★ fetch(localUri).arrayBuffer() 로 읽지 마세요.
 *   React Native 에서는 빈 데이터가 나와서 14바이트짜리 깨진 파일이 올라갑니다.
 *   업로드 자체는 성공하므로 에러도 안 나고, 사진만 안 보입니다.
 */
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const uploadUri = await toUploadableJpeg(localUri);
  const path = `${userId}/avatar.jpg`;

  const bytes = await new File(uploadUri).bytes();

  const { error } = await supabase.storage.from('avatars').upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // 같은 경로에 덮어쓰므로 캐시를 깨기 위해 쿼리스트링을 붙인다
  return `${data.publicUrl}?v=${Date.now()}`;
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
