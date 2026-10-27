import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { isUniversityEmail } from '@/constants/workout';
import { signInWithPassword, signUpWithPassword, toKoreanAuthError } from '@/features/auth/api';
import { useAppColors } from '@/hooks/use-app-colors';

type Mode = 'signin' | 'signup';

const MODES: { value: Mode; label: string }[] = [
  { value: 'signup', label: '회원가입' },
  { value: 'signin', label: '로그인' },
];

/**
 * 화면은 "무엇을 보여줄지"만 담당합니다.
 * Supabase 호출은 전부 features/auth/api.ts 안에 있습니다.
 */
export default function LoginScreen() {
  const colors = useAppColors();
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const inputStyle = [styles.input, { color: colors.text, backgroundColor: colors.card }];

  const valid = email.includes('@') && password.length >= 6;

  async function handleSubmit() {
    if (mode === 'signup' && !isUniversityEmail(email)) {
      Alert.alert('학교 이메일이 필요해요', '재학 중인 학교 이메일(.ac.kr)로 가입해주세요.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUpWithPassword(email, password);
      } else {
        await signInWithPassword(email, password);
      }
      // 세션이 생기면 SessionProvider → AuthGate 가 알아서 다음 화면으로 보냅니다.
    } catch (error) {
      Alert.alert(mode === 'signup' ? '가입 실패' : '로그인 실패', toKoreanAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.hero}>
          <Text style={[Typography.label, { color: colors.primary }]}>오운족</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            같이 운동할 사람,{'\n'}
            <Text style={{ color: colors.primary }}>우리 학교</Text> 안에서
          </Text>
        </View>

        {/* 회원가입 / 로그인 전환. 선택된 쪽만 연두색으로 채운다 */}
        <View style={[styles.tabs, { backgroundColor: colors.card }]}>
          {MODES.map((item) => {
            const active = mode === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => setMode(item.value)}
                style={[styles.tab, active && { backgroundColor: colors.primary }]}>
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? colors.onPrimary : colors.textMuted },
                  ]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.field}>
          <Text style={[Typography.label, { color: colors.textMuted }]}>학교 이메일</Text>
          <TextInput
            style={inputStyle}
            value={email}
            onChangeText={setEmail}
            placeholder="hong@univ.ac.kr"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!busy}
          />
        </View>

        <View style={styles.field}>
          <Text style={[Typography.label, { color: colors.textMuted }]}>비밀번호</Text>
          <TextInput
            style={inputStyle}
            value={password}
            onChangeText={setPassword}
            placeholder="6자 이상"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            editable={!busy}
          />
        </View>

        <Text style={[Typography.caption, { color: colors.textMuted }]}>
          {mode === 'signup'
            ? '학교 이메일로 가입하면 같은 학교 학생만 만날 수 있어요.'
            : '가입할 때 쓴 이메일과 비밀번호를 입력해주세요.'}
        </Text>

        <PrimaryButton
          label={mode === 'signup' ? '가입하고 시작하기' : '로그인'}
          onPress={handleSubmit}
          busy={busy}
          disabled={!valid}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.lg },
  hero: { gap: Spacing.sm, marginBottom: Spacing.md },
  title: { ...Typography.display, fontSize: 32, lineHeight: 42 },
  tabs: { flexDirection: 'row', borderRadius: Radius.md, padding: Spacing.xs, gap: Spacing.xs },
  tab: { flex: 1, borderRadius: Radius.sm, paddingVertical: Spacing.md, alignItems: 'center' },
  tabText: { fontSize: 15, fontWeight: '800' },
  field: { gap: Spacing.sm },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    ...Typography.body,
    fontSize: 16,
  },
});
