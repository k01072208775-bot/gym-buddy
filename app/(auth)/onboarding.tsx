import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipGroup } from '@/components/ui/chip-group';
import { PrimaryButton } from '@/components/ui/primary-button';
import { EXPERIENCE_LABELS, GENDER_LABELS, SPORTS, TIME_SLOTS } from '@/constants/workout';
import { useSaveProfile } from '@/features/profile/hooks';
import { useAppColors } from '@/hooks/use-app-colors';
import type { ExperienceLevel, Gender } from '@/types/database';

const GENDERS = Object.keys(GENDER_LABELS) as Gender[];
const EXPERIENCES = Object.keys(EXPERIENCE_LABELS) as ExperienceLevel[];

export default function OnboardingScreen() {
  const colors = useAppColors();
  const [nickname, setNickname] = useState('');
  const [university, setUniversity] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthYear, setBirthYear] = useState('');
  const [gymName, setGymName] = useState('');
  const [sports, setSports] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [experience, setExperience] = useState<ExperienceLevel>('beginner');

  const save = useSaveProfile();

  const inputStyle = [
    styles.input,
    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
  ];

  const valid =
    nickname.trim().length >= 2 &&
    university.trim().length > 0 &&
    gender !== null &&
    /^\d{4}$/.test(birthYear) &&
    sports.length > 0 &&
    timeSlots.length > 0;

  function handleSubmit() {
    if (!valid || !gender) return;

    save.mutate(
      {
        profile: {
          nickname: nickname.trim(),
          university: university.trim(),
          gender,
          birth_year: Number(birthYear),
        },
        prefs: {
          sports,
          time_slots: timeSlots,
          gym_name: gymName.trim() || null,
          experience,
        },
      },
      {
        // 저장에 성공하면 AuthGate 가 자동으로 탭 화면으로 보냅니다.
        onError: (error) => Alert.alert('저장 실패', (error as Error).message),
      }
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>프로필 만들기</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          운동 취향이 비슷한 사람부터 보여드릴게요.
        </Text>

        <Field label="닉네임">
          <TextInput
            style={inputStyle}
            value={nickname}
            onChangeText={setNickname}
            placeholder="2~12자"
            placeholderTextColor={colors.textMuted}
            maxLength={12}
          />
        </Field>

        <Field label="학교">
          <TextInput
            style={inputStyle}
            value={university}
            onChangeText={setUniversity}
            placeholder="○○대학교"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Field label="성별">
          <ChipGroup
            options={GENDERS.map((g) => GENDER_LABELS[g])}
            selected={gender ? [GENDER_LABELS[gender]] : []}
            onChange={(next) => {
              const picked = next[next.length - 1];
              setGender(GENDERS.find((g) => GENDER_LABELS[g] === picked) ?? null);
            }}
            max={1}
          />
        </Field>

        <Field label="출생 연도">
          <TextInput
            style={inputStyle}
            value={birthYear}
            onChangeText={setBirthYear}
            placeholder="2003"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={4}
          />
        </Field>

        <Field label="어떤 운동을 하나요? (최대 5개)">
          <ChipGroup options={SPORTS} selected={sports} onChange={setSports} max={5} />
        </Field>

        <Field label="주로 언제 운동하나요? (최대 4개)">
          <ChipGroup options={TIME_SLOTS} selected={timeSlots} onChange={setTimeSlots} max={4} />
        </Field>

        <Field label="운동 경력">
          <ChipGroup
            options={EXPERIENCES.map((e) => EXPERIENCE_LABELS[e])}
            selected={[EXPERIENCE_LABELS[experience]]}
            onChange={(next) => {
              const picked = next[next.length - 1];
              const found = EXPERIENCES.find((e) => EXPERIENCE_LABELS[e] === picked);
              if (found) setExperience(found);
            }}
            max={1}
          />
        </Field>

        <Field label="자주 가는 헬스장 (선택)">
          <TextInput
            style={inputStyle}
            value={gymName}
            onChangeText={setGymName}
            placeholder="○○피트니스 정문점"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <PrimaryButton
          label="시작하기"
          onPress={handleSubmit}
          busy={save.isPending}
          disabled={!valid}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useAppColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 20, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: -12 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
});
