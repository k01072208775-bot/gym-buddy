import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { EXPERIENCE_LABELS } from '@/constants/workout';
import { signOut } from '@/features/auth/api';
import { useMyProfile } from '@/features/profile/hooks';
import { useAppColors } from '@/hooks/use-app-colors';

const AVATAR_SIZE = 72;

export default function ProfileScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const { data: profile } = useMyProfile();

  if (!profile) return null;

  async function handleSignOut() {
    try {
      await signOut();
      // 세션이 사라지면 AuthGate 가 로그인 화면으로 되돌립니다.
    } catch (error) {
      Alert.alert('로그아웃 실패', (error as Error).message);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.chip, borderColor: colors.border }]}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.image} contentFit="cover" />
          ) : (
            <Text style={[styles.initial, { color: colors.textMuted }]}>
              {profile.nickname.slice(0, 1)}
            </Text>
          )}
        </View>

        <View style={styles.headerText}>
          <Text style={[styles.nickname, { color: colors.text }]}>{profile.nickname}</Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {profile.university} · {new Date().getFullYear() - profile.birth_year + 1}세
          </Text>
        </View>
      </View>

      {profile.bio ? (
        <Text style={[styles.bio, { color: colors.text }]}>{profile.bio}</Text>
      ) : null}

      <Row label="운동 종목" value={profile.prefs?.sports.join(' · ') ?? '-'} />
      <Row label="운동 시간대" value={profile.prefs?.time_slots.join(' · ') ?? '-'} />
      <Row label="헬스장" value={profile.prefs?.gym_name ?? '-'} />
      <Row
        label="경력"
        value={profile.prefs ? EXPERIENCE_LABELS[profile.prefs.experience] : '-'}
      />

      <View style={styles.spacer} />
      <PrimaryButton label="프로필 수정" onPress={() => router.push('/profile/edit')} />

      <Pressable onPress={handleSignOut} style={styles.signOut} hitSlop={8}>
        <Text style={[styles.signOutText, { color: colors.textMuted }]}>로그아웃</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const colors = useAppColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  initial: { fontSize: 28, fontWeight: '800' },
  headerText: { flex: 1, gap: Spacing.xs },
  nickname: Typography.title,
  meta: Typography.caption,
  bio: { ...Typography.body, marginBottom: Spacing.xs },
  row: { gap: 2 },
  label: Typography.label,
  value: Typography.body,
  spacer: { height: Spacing.md },
  signOut: { alignItems: 'center', paddingVertical: Spacing.lg },
  signOutText: Typography.body,
});
