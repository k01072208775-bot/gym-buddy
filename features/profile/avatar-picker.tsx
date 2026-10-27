import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';
import { avatarColor } from '@/lib/avatar-color';
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

  // Avatar 와 같은 규칙으로 색을 고릅니다 (같은 사람은 같은 색)
  const palette = avatarColor(nickname);

  async function handlePick() {
    // SDK 54 부터 iOS 는 권한을 먼저 직접 물어야 합니다 (안 그러면 갑자기 권한창이 뜸)
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('사진 권한이 필요해요', '설정에서 오운족의 사진 접근을 켜주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      // 압축은 uploadAvatar 에서 한 번만 합니다 (여기 quality 는 PNG 에 안 먹습니다)
    });
    if (result.canceled) return;

    upload.mutate(result.assets[0].uri, {
      onError: (error) => Alert.alert('사진 업로드 실패', (error as Error).message),
    });
  }

  return (
    <View style={styles.wrap}>
      <Pressable onPress={handlePick} disabled={upload.isPending}>
        <View
          style={[
            styles.circle,
            { backgroundColor: url ? colors.chip : palette.bg, borderColor: colors.border },
          ]}>
          {upload.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : url ? (
            <Image source={{ uri: url }} style={styles.image} contentFit="cover" transition={150} />
          ) : (
            <Text style={[styles.initial, { color: palette.text }]}>
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
