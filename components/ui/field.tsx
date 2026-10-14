import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';

/**
 * 입력 한 칸 = 작은 항목 이름 + 입력 요소.
 * 온보딩·프로필 수정·글쓰기가 같은 모양을 쓰도록 여기에 모아둡니다.
 */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  /** 입력칸 아래 작은 설명 */
  hint?: string;
  children: ReactNode;
}) {
  const colors = useAppColors();

  return (
    <View style={styles.field}>
      <Text style={[Typography.label, { color: colors.textMuted }]}>{label}</Text>
      {children}
      {hint ? (
        <Text style={[Typography.caption, { color: colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.sm },
});
