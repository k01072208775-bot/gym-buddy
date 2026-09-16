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
import { isUniversityEmail } from '@/constants/workout';
import { signInWithPassword, signUpWithPassword, toKoreanAuthError } from '@/features/auth/api';
import { useAppColors } from '@/hooks/use-app-colors';

type Mode = 'signin' | 'signup';

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

  const inputStyle = [
    styles.input,
    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
  ];

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
        <Text style={[styles.title, { color: colors.text }]}>
          같이 운동할 사람,{'\n'}우리 학교 안에서
        </Text>

        <View style={[styles.tabs, { borderColor: colors.border }]}>
          {(['signup', 'signin'] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.tab, mode === m && { backgroundColor: colors.primary }]}>
              <Text
                style={[
                  styles.tabText,
                  { color: mode === m ? colors.onPrimary : colors.textMuted },
                ]}>
                {m === 'signup' ? '회원가입' : '로그인'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textMuted }]}>학교 이메일</Text>
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

        <Text style={[styles.label, { color: colors.textMuted }]}>비밀번호</Text>
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

        <Text style={[styles.hint, { color: colors.textMuted }]}>
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
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 10 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24, lineHeight: 38 },
  tabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 8,
  },
  tab: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  tabText: { fontSize: 15, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  hint: { fontSize: 13, marginBottom: 8 },
});
