import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';

/**
 * 목록이 비었을 때 보여주는 안내.
 * 글자만 덩그러니 두면 "고장난 건가" 싶어 보여서 아이콘을 함께 둡니다.
 */
export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
}) {
  const colors = useAppColors();

  return (
    <View style={styles.wrap}>
      <View style={[styles.circle, { backgroundColor: colors.chip }]}>
        <Ionicons name={icon} size={34} color={colors.textMuted} />
      </View>
      <Text style={[Typography.heading, { color: colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[Typography.body, styles.description, { color: colors.textMuted }]}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: Spacing.sm },
  circle: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  description: { textAlign: 'center' },
});
