import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Radius } from '@/constants/theme';

/** 불러오기 전에 잠깐 쓰는 비율 */
const PLACEHOLDER_RATIO = 4 / 3;
/** 이보다 긴 사진은 위아래를 조금 자릅니다. 폰 스크린샷(9:16)까지는 온전히 보입니다 */
const MIN_RATIO = 9 / 16;
/** 파노라마처럼 아주 넓은 사진이 납작한 띠가 되지 않게 */
const MAX_RATIO = 2;

/**
 * 글 상세의 사진 한 장.
 * 칸을 4:3 으로 고정하면 세로 사진은 위아래가 잘리므로,
 * 사진을 불러온 뒤 실제 크기를 보고 그 비율로 칸을 맞춥니다.
 */
export function PostImage({ url }: { url: string }) {
  const [ratio, setRatio] = useState(PLACEHOLDER_RATIO);

  return (
    <Image
      source={{ uri: url }}
      style={[styles.image, { aspectRatio: ratio }]}
      contentFit="cover"
      transition={150}
      onLoad={({ source }) => {
        if (source.width > 0 && source.height > 0) {
          setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, source.width / source.height)));
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', borderRadius: Radius.lg },
});
