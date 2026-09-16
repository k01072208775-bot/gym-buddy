import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
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
      <AvatarPicker url={profile.avatar_url} nickname={profile.nickname} />
      <ProfileForm initial={profile} submitLabel="저장" onSaved={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: 48 },
});
