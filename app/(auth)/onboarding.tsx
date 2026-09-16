import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing, Typography } from '@/constants/theme';
import { ProfileForm } from '@/features/profile/profile-form';
import { useAppColors } from '@/hooks/use-app-colors';

export default function OnboardingScreen() {
  const colors = useAppColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>프로필 만들기</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          운동 취향이 비슷한 사람부터 보여드릴게요.
        </Text>

        {/* 저장에 성공하면 AuthGate 가 알아서 탭 화면으로 보냅니다 */}
        <ProfileForm submitLabel="시작하기" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: 48 },
  title: Typography.display,
  subtitle: { ...Typography.body, marginTop: -Spacing.md },
});
