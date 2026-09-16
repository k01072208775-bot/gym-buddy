import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';
import { useUploadAvatar } from './hooks';

const SIZE = 104;

/**
 * 프로필 사진 고르기 + 업로드.
 * 저장 버튼을 따로 누를 필요 없이, 사진을 고르는 즉시 올라가고
 * profiles.avatar_url 까지 갱신됩니다.
 */
export function AvatarPicker({ url, nickname }: { url: string | null; nickname: string }) {
  const colors = useAppColors();
  const upload = useUploadAvatar();

  async function handlePick() {
    // SDK 54 부터 iOS 는 권한을 먼저 직접 물어야 합니다 (안 그러면 갑자기 권한창이 뜸)
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('사진 권한이 필요해요', '설정에서 gym-buddy 의 사진 접근을 켜주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;

    upload.mutate(result.assets[0].uri, {
      onError: (error) => Alert.alert('사진 업로드 실패', (error as Error).message),
    });
  }

  return (
    <View style={styles.wrap}>
      <Pressable onPress={handlePick} disabled={upload.isPending}>
        <View style={[styles.circle, { backgroundColor: colors.chip, borderColor: colors.border }]}>
          {upload.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : url ? (
            <Image source={{ uri: url }} style={styles.image} contentFit="cover" transition={150} />
          ) : (
            <Text style={[styles.initial, { color: colors.textMuted }]}>
              {nickname.slice(0, 1)}
            </Text>
          )}
        </View>
      </Pressable>

      <Pressable onPress={handlePick} disabled={upload.isPending} hitSlop={8}>
        <Text style={[styles.change, { color: colors.primary }]}>
          {url ? '사진 바꾸기' : '사진 올리기'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.sm },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  initial: { fontSize: 40, fontWeight: '800' },
  change: Typography.label,
});
