import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';

/**
 * 여러 개 중 하나만 고르는 칩 선택기.
 * (여러 개를 고르는 건 chip-group.tsx — 두 컴포넌트는 모양을 똑같이 맞춰둡니다)
 *
 * scroll 을 켜면 한 줄로 늘어놓고 옆으로 밀어서 봅니다 (종목처럼 항목이 많을 때).
 */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  scroll = false,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (next: T) => void;
  scroll?: boolean;
}) {
  const colors = useAppColors();

  const chips = options.map((option) => {
    const active = option.value === value;
    return (
      <Pressable
        key={option.value}
        onPress={() => onChange(option.value)}
        style={[
          styles.chip,
          active
            ? { backgroundColor: colors.selected, borderColor: colors.selected }
            : { backgroundColor: colors.card, borderColor: colors.border },
        ]}>
        <Text
          style={[
            styles.label,
            { color: active ? colors.onSelected : colors.textMuted },
            active && styles.labelActive,
          ]}>
          {option.label}
        </Text>
      </Pressable>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}>
        {chips}
      </ScrollView>
    );
  }

  return <View style={styles.wrapRow}>{chips}</View>;
}

const styles = StyleSheet.create({
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  scrollRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  chip: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: 7,
  },
  label: { fontSize: 14 },
  labelActive: { fontWeight: '700' },
});
