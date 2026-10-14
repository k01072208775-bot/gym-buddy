import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';

/**
 * 눌리지 않는 작은 태그 (운동 종목 표시용).
 * 고르는 칩은 chip-group / choice-chips 를 쓰세요. 모양은 그것과 맞춰둡니다.
 */
export function Tag({ label, active = false }: { label: string; active?: boolean }) {
  const colors = useAppColors();

  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: active ? colors.primarySoft : colors.chip },
      ]}>
      <Text
        style={[
          styles.label,
          { color: active ? colors.onPrimarySoft : colors.textMuted },
          active && styles.labelActive,
        ]}>
        {label}
      </Text>
    </View>
  );
}

/** 태그 여러 개를 줄바꿈하며 늘어놓기 */
export function TagRow({ labels, highlight = [] }: { labels: string[]; highlight?: string[] }) {
  return (
    <View style={styles.row}>
      {labels.map((label) => (
        <Tag key={label} label={label} active={highlight.includes(label)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tag: { borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  label: { fontSize: 13 },
  labelActive: { fontWeight: '700' },
});
