import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';

/**
 * − 숫자 + 로 값을 올리고 내리는 입력.
 * 칩을 미리 정해둔 숫자만 고르게 하면 "7명"처럼 중간 값을 못 넣습니다.
 */
export function Stepper({
  value,
  onChange,
  min,
  max,
  format,
}: {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  /** 가운데 보여줄 글자. 없으면 숫자만 */
  format?: (value: number) => string;
}) {
  const colors = useAppColors();

  return (
    <View style={styles.row}>
      <StepButton label="−" disabled={value <= min} onPress={() => onChange(value - 1)} />
      <Text style={[styles.value, { color: colors.text }]}>
        {format ? format(value) : String(value)}
      </Text>
      <StepButton label="+" disabled={value >= max} onPress={() => onChange(value + 1)} />
    </View>
  );
}

function StepButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useAppColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={[styles.button, { backgroundColor: colors.chip }, disabled && styles.disabled]}>
      <Text style={[styles.buttonText, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  button: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.35 },
  buttonText: { fontSize: 22, fontWeight: '800' },
  value: { ...Typography.heading, minWidth: 72, textAlign: 'center' },
});
