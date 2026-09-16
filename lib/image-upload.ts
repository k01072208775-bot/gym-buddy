import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from './supabase';

/**
 * 사진첩에서 고른 사진을 업로드용으로 줄여 스토리지에 올립니다.
 *
 * 프로필 사진과 게시글 사진이 똑같은 방식을 쓰는데
 * features/A 가 features/B 를 import 하면 안 되므로 여기(lib) 에 둡니다.
 *
 * ★ fetch(localUri).arrayBuffer() 로 읽지 마세요.
 *   React Native 에서는 빈 데이터가 나와서 14바이트짜리 깨진 파일이 올라갑니다.
 *   업로드 자체는 성공하므로 에러도 안 나고, 사진만 안 보입니다.
 *
 * ★ 압축을 이미지 선택기의 quality 옵션에 맡기지 마세요.
 *   그 옵션은 JPEG 에만 먹어서, PNG 로 나오는 안드로이드에서는
 *   1.4MB 짜리 원본이 그대로 올라갑니다. 여기서 형식까지 JPEG 로 고정합니다.
 */
export async function uploadImage({
  bucket,
  path,
  localUri,
  maxWidth,
}: {
  bucket: string;
  /** 반드시 <userId>/... 로 시작해야 스토리지 RLS 정책과 맞습니다 */
  path: string;
  localUri: string;
  maxWidth: number;
}): Promise<string> {
  const context = ImageManipulator.manipulate(localUri);
  // height 를 주지 않으면 비율을 유지하므로 정사각형이 아니어도 찌그러지지 않습니다
  context.resize({ width: maxWidth });

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });

  const bytes = await new File(saved.uri).bytes();

  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  // 같은 경로에 덮어쓸 수 있으므로 캐시를 깨기 위해 쿼리스트링을 붙인다
  return `${data.publicUrl}?v=${Date.now()}`;
}
