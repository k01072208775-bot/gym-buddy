import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';
import { MAX_POST_IMAGES } from './api';
import { useUploadPostImage } from './hooks';

const THUMB = 84;

/**
 * 글에 붙일 사진 고르기.
 * 고른 즉시 올리고 URL 만 들고 있다가 글을 저장할 때 함께 보냅니다.
 * (글 id 가 나오기 전에 올려야 해서 이 순서일 수밖에 없습니다)
 */
export function PostImagePicker({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (next: string[]) => void;
}) {
  const colors = useAppColors();
  const upload = useUploadPostImage();

  const remaining = MAX_POST_IMAGES - urls.length;

  async function handleAdd() {
    if (remaining <= 0 || upload.isPending) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('사진 권한이 필요해요', '설정에서 오운족의 사진 접근을 켜주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (result.canceled) return;

    try {
      const uploaded: string[] = [];
      for (const asset of result.assets) {
        uploaded.push(await upload.mutateAsync(asset.uri));
      }
      onChange([...urls, ...uploaded]);
    } catch (error) {
      // 여러 장 중 일부만 올라갔어도 올라간 것까지는 살립니다
      Alert.alert('사진 업로드 실패', (error as Error).message);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textMuted }]}>
        사진 {urls.length}/{MAX_POST_IMAGES}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {urls.map((url) => (
          <View key={url} style={styles.thumbBox}>
            <Image source={{ uri: url }} style={styles.thumb} contentFit="cover" />
            <Pressable
              style={[styles.remove, { backgroundColor: colors.background }]}
              hitSlop={8}
              onPress={() => onChange(urls.filter((item) => item !== url))}>
              <Text style={[styles.removeText, { color: colors.text }]}>✕</Text>
            </Pressable>
          </View>
        ))}

        {remaining > 0 ? (
          <Pressable
            onPress={handleAdd}
            disabled={upload.isPending}
            style={[styles.add, { borderColor: colors.border, backgroundColor: colors.card }]}>
            {upload.isPending ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={[styles.addText, { color: colors.textMuted }]}>＋</Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  label: Typography.label,
  row: { gap: Spacing.sm, paddingRight: Spacing.lg },
  thumbBox: { width: THUMB, height: THUMB },
  thumb: { width: '100%', height: '100%', borderRadius: Radius.md },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { fontSize: 12, fontWeight: '700' },
  add: {
    width: THUMB,
    height: THUMB,
    borderWidth: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontSize: 26 },
});
