import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { EXPERIENCE_LABELS } from '@/constants/workout';
import { signOut } from '@/features/auth/api';
import { useMyProfile } from '@/features/profile/hooks';
import { useAppColors } from '@/hooks/use-app-colors';

export default function ProfileScreen() {
  const colors = useAppColors();
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
      <Text style={[styles.nickname, { color: colors.text }]}>{profile.nickname}</Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        {profile.university} · {new Date().getFullYear() - profile.birth_year + 1}세
      </Text>

      <Row label="운동 종목" value={profile.prefs?.sports.join(' · ') ?? '-'} />
      <Row label="운동 시간대" value={profile.prefs?.time_slots.join(' · ') ?? '-'} />
      <Row label="헬스장" value={profile.prefs?.gym_name ?? '-'} />
      <Row
        label="경력"
        value={profile.prefs ? EXPERIENCE_LABELS[profile.prefs.experience] : '-'}
      />

      <View style={styles.spacer} />
      <PrimaryButton label="로그아웃" onPress={handleSignOut} />
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
  content: { padding: 24, gap: 12 },
  nickname: { fontSize: 24, fontWeight: '700' },
  meta: { fontSize: 14, marginBottom: 12 },
  row: { gap: 2 },
  label: { fontSize: 13 },
  value: { fontSize: 16 },
  spacer: { height: 24 },
});
