import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';
import { avatarColor } from '@/lib/avatar-color';

/** 프로필 사진 동그라미. 사진이 없으면 닉네임 첫 글자를 색 배경에 보여줍니다. */
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
  const initial = name.trim().slice(0, 1);
  const palette = avatarColor(name);

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          backgroundColor: url ? colors.chip : palette.bg,
          borderColor: colors.border,
        },
      ]}>
      {url ? (
        <Image source={{ uri: url }} style={styles.image} contentFit="cover" transition={150} />
      ) : initial ? (
        <Text style={[styles.initial, { color: palette.text, fontSize: size * 0.4 }]}>
          {initial}
        </Text>
      ) : (
        // 닉네임이 비어 있는 경우(탈퇴 등)에만 사람 아이콘
        <Ionicons name="person" size={size * 0.5} color={colors.textMuted} />
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
