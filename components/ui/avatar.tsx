import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';

/** 프로필 사진 동그라미. 사진이 없으면 닉네임 첫 글자를 보여줍니다. */
export function Avatar({
  url,
  name,
  size,
}: {
  url: string | null;
  name: string;
  size: number;
}) {
  const colors = useAppColors();

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, backgroundColor: colors.chip, borderColor: colors.border },
      ]}>
      {url ? (
        <Image source={{ uri: url }} style={styles.image} contentFit="cover" transition={150} />
      ) : (
        <Text style={[styles.initial, { color: colors.textMuted, fontSize: size * 0.4 }]}>
          {name.slice(0, 1)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  initial: { fontWeight: '800' },
});
