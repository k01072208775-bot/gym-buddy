import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';

/**
 * 여러 개를 골라 담는 태그 선택기.
 * 온보딩(운동 종목·시간대)과 프로필 수정 화면이 같은 컴포넌트를 씁니다.
 * (하나만 고르는 건 choice-chips.tsx — 두 컴포넌트는 모양을 똑같이 맞춰둡니다)
 */
export function ChipGroup<T extends string>({
  options,
  selected,
  onChange,
  max,
}: {
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
  max?: number;
}) {
  const colors = useAppColors();

  function toggle(value: T) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else if (!max || selected.length < max) {
      onChange([...selected, value]);
    }
  }

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <Pressable
            key={option}
            onPress={() => toggle(option)}
            style={[styles.chip, { backgroundColor: active ? colors.primary : colors.chip }]}>
            <Text
              style={[
                styles.label,
                { color: active ? colors.onPrimary : colors.text },
                active && styles.labelActive,
              ]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  label: { fontSize: 14 },
  labelActive: { fontWeight: '700' },
});
