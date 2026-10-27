import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceChips } from '@/components/ui/choice-chips';
import { Field } from '@/components/ui/field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Stepper } from '@/components/ui/stepper';
import { WORKOUT_SPORTS } from '@/constants/board';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useCreateTournament } from '@/features/tournament/hooks';
import { useAppColors } from '@/hooks/use-app-colors';

const SPORT_OPTIONS = WORKOUT_SPORTS.map((sport) => ({ value: sport, label: sport }));

const LIMIT_OPTIONS = [
  { value: 'off', label: '제한 없음' },
  { value: 'on', label: '정원 정하기' },
] as const;

/** DB 제약(tournaments.capacity)과 같은 범위여야 합니다 */
const MIN_CAPACITY = 2;
const MAX_CAPACITY = 64;
const DEFAULT_CAPACITY = 8;

export default function NewTournamentScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const create = useCreateTournament();

  const [title, setTitle] = useState('');
  const [sport, setSport] = useState<string | null>(null);
  const [venue, setVenue] = useState('');
  /** null = 정원 제한 없음 */
  const [capacity, setCapacity] = useState<number | null>(null);

  const inputStyle = [styles.input, { color: colors.text, backgroundColor: colors.card }];
  const canSubmit = title.trim().length >= 2 && sport !== null;

  function handleSubmit() {
    if (!canSubmit || !sport) return;

    create.mutate(
      { title, sport, venue: venue || null, startsAt: null, capacity },
      {
        onSuccess: (id) => router.replace(`/tournament/${id}`),
        onError: (error) => Alert.alert('만들기 실패', (error as Error).message),
      }
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 44}>
      <Stack.Screen options={{ title: '대회 만들기' }} />

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Field label="대회 이름">
          <TextInput
            style={inputStyle}
            value={title}
            onChangeText={setTitle}
            placeholder="예: 창업동아리 가을 당구대회"
            placeholderTextColor={colors.textMuted}
            maxLength={60}
          />
        </Field>

        <Field label="종목">
          <ChoiceChips options={SPORT_OPTIONS} value={sport} onChange={setSport} />
        </Field>

        <Field
          label="참가 정원"
          hint="당구대 수나 진행 시간에 맞춰 정하세요. 나중에 대회 화면에서 바꿀 수 있어요.">
          <ChoiceChips
            options={LIMIT_OPTIONS}
            value={capacity === null ? 'off' : 'on'}
            onChange={(next) => setCapacity(next === 'off' ? null : DEFAULT_CAPACITY)}
          />
          {capacity !== null ? (
            <View style={styles.stepper}>
              <Stepper
                value={capacity}
                onChange={setCapacity}
                min={MIN_CAPACITY}
                max={MAX_CAPACITY}
                format={(n) => n + '명'}
              />
            </View>
          ) : null}
        </Field>

        <Field label="장소 (선택)" hint="참가자가 어디로 가야 하는지 적어주세요.">
          <TextInput
            style={inputStyle}
            value={venue}
            onChangeText={setVenue}
            placeholder="예: 학생회관 1층 당구장"
            placeholderTextColor={colors.textMuted}
            maxLength={100}
          />
        </Field>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, Spacing.md),
          },
        ]}>
        <PrimaryButton
          label="만들기"
          onPress={handleSubmit}
          busy={create.isPending}
          disabled={!canSubmit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xl },
  stepper: { marginTop: Spacing.sm },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    ...Typography.body,
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
