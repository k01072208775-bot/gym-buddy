import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { showMessage } from '@/lib/dialog';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TagRow } from '@/components/ui/tag';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { EXPERIENCE_LABELS } from '@/constants/workout';
import { signOut } from '@/features/auth/api';
import { useMyProfile } from '@/features/profile/hooks';
import { useAppColors } from '@/hooks/use-app-colors';

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
      showMessage('로그아웃 실패', (error as Error).message);
    }
  }

  const age = new Date().getFullYear() - profile.birth_year + 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="내 프로필" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.identity}>
            <Avatar url={profile.avatar_url} name={profile.nickname} size={72} />
            <View style={styles.identityText}>
              <Text style={[Typography.title, { color: colors.text }]} numberOfLines={1}>
                {profile.nickname}
              </Text>
              <Text style={[Typography.caption, { color: colors.textMuted }]}>
                {profile.university} · {age}세
              </Text>
            </View>
          </View>

          {profile.bio ? (
            <Text style={[Typography.body, { color: colors.text }]}>{profile.bio}</Text>
          ) : (
            <Text style={[Typography.body, { color: colors.textMuted }]}>
              자기소개가 비어 있어요. 한 줄만 적어도 매칭이 잘 돼요.
            </Text>
          )}
        </View>

        <Section title="운동 종목">
          <TagRow labels={profile.prefs?.sports ?? []} />
        </Section>

        <Section title="운동 시간대">
          <TagRow labels={profile.prefs?.time_slots ?? []} />
        </Section>

        <Section title="경력">
          <Text style={[Typography.body, { color: colors.text }]}>
            {profile.prefs ? EXPERIENCE_LABELS[profile.prefs.experience] : '-'}
          </Text>
        </Section>

        <Section title="자주 가는 헬스장">
          <Text style={[Typography.body, { color: profile.prefs?.gym_name ? colors.text : colors.textMuted }]}>
            {profile.prefs?.gym_name ?? '적지 않았어요'}
          </Text>
        </Section>

        <View style={styles.buttons}>
          <PrimaryButton label="프로필 수정" onPress={() => router.push('/profile/edit')} />
          <Pressable onPress={handleSignOut} style={styles.signOut} hitSlop={8}>
            <Text style={[Typography.body, { color: colors.textMuted }]}>로그아웃</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const colors = useAppColors();
  return (
    <View style={styles.section}>
      <Text style={[Typography.label, { color: colors.textMuted }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xl, gap: Spacing.xl },
  card: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  identityText: { flex: 1, gap: Spacing.xs },
  section: { gap: Spacing.sm },
  buttons: { gap: Spacing.xs, marginTop: Spacing.sm },
  signOut: { alignItems: 'center', paddingVertical: Spacing.lg },
});
