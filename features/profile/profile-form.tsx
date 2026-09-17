import { useState, type ReactNode } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { ChipGroup } from '@/components/ui/chip-group';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { EXPERIENCE_LABELS, GENDER_LABELS, SPORTS, TIME_SLOTS } from '@/constants/workout';
import { useAppColors } from '@/hooks/use-app-colors';
import type { ExperienceLevel, Gender } from '@/types/database';
import type { MyProfile } from './api';
import { useSaveProfile } from './hooks';

const GENDERS = Object.keys(GENDER_LABELS) as Gender[];
const EXPERIENCES = Object.keys(EXPERIENCE_LABELS) as ExperienceLevel[];

/**
 * 프로필 입력 폼. 온보딩(처음 만들기)과 프로필 수정이 같은 폼을 씁니다.
 * 화면마다 폼을 따로 두면 항목이 하나 늘 때마다 한쪽을 빠뜨리게 됩니다.
 *
 * 사진은 저장 버튼과 상관없이 고르는 즉시 올라가므로 여기 있지 않습니다 (avatar-picker.tsx).
 */
export function ProfileForm({
  initial,
  submitLabel,
  onSaved,
}: {
  /** 없으면 새로 만들기(온보딩), 있으면 그 값으로 채워진 수정 폼 */
  initial?: MyProfile | null;
  submitLabel: string;
  onSaved?: () => void;
}) {
  const colors = useAppColors();

  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [university, setUniversity] = useState(initial?.university ?? '');
  const [gender, setGender] = useState<Gender | null>(initial?.gender ?? null);
  const [birthYear, setBirthYear] = useState(initial ? String(initial.birth_year) : '');
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [gymName, setGymName] = useState(initial?.prefs?.gym_name ?? '');
  const [sports, setSports] = useState<string[]>(initial?.prefs?.sports ?? []);
  const [timeSlots, setTimeSlots] = useState<string[]>(initial?.prefs?.time_slots ?? []);
  const [experience, setExperience] = useState<ExperienceLevel>(
    initial?.prefs?.experience ?? 'beginner'
  );

  const save = useSaveProfile();

  // 로그인·채팅 입력칸과 같은 모양: 테두리 없이 한 단계 밝은 면
  const inputStyle = [styles.input, { color: colors.text, backgroundColor: colors.card }];

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
          bio: bio.trim() || null,
        },
        prefs: {
          sports,
          time_slots: timeSlots,
          gym_name: gymName.trim() || null,
          experience,
        },
      },
      {
        onSuccess: () => onSaved?.(),
        onError: (error) => Alert.alert('저장 실패', (error as Error).message),
      }
    );
  }

  return (
    <View style={styles.form}>
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

      <Field label="자기소개 (선택)">
        <TextInput
          style={[...inputStyle, styles.bio]}
          value={bio}
          onChangeText={setBio}
          placeholder="같이 운동할 사람에게 하고 싶은 말"
          placeholderTextColor={colors.textMuted}
          maxLength={200}
          multiline
        />
      </Field>

      <PrimaryButton
        label={submitLabel}
        onPress={handleSubmit}
        busy={save.isPending}
        disabled={!valid}
      />
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const colors = useAppColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.xl },
  field: { gap: Spacing.sm },
  label: Typography.label,
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    ...Typography.body,
  },
  bio: { minHeight: 92, textAlignVertical: 'top' },
});
