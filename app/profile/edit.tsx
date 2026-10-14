import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { AvatarPicker } from '@/features/profile/avatar-picker';
import { useMyProfile } from '@/features/profile/hooks';
import { ProfileForm } from '@/features/profile/profile-form';
import { useAppColors } from '@/hooks/use-app-colors';

export default function EditProfileScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const { data: profile } = useMyProfile();

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={styles.photo}>
        <AvatarPicker url={profile.avatar_url} nickname={profile.nickname} />
        {/* 사진은 아래 저장 버튼과 상관없이 고르는 즉시 올라가므로 그 점을 알려준다 */}
        <Text style={[Typography.caption, styles.photoHint, { color: colors.textMuted }]}>
          사진은 고르면 바로 저장돼요
        </Text>
      </View>

      <ProfileForm initial={profile} submitLabel="저장" onSaved={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: 48 },
  photo: { alignItems: 'center', gap: Spacing.xs },
  photoHint: { textAlign: 'center' },
});
