import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing, Typography } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';

/**
 * 탭 화면 맨 위의 큰 제목. "스포츠형" 디자인은 기본 내비게이션 헤더 대신 이걸 씁니다.
 * 이 컴포넌트를 쓰는 화면은 (tabs)/_layout.tsx 에서 headerShown: false 로 두세요.
 */
export function ScreenHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  /** 제목 아래에 붙는 탭·필터 같은 것 */
  children?: ReactNode;
}) {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + Spacing.md, backgroundColor: colors.card },
      ]}>
      <Text style={[Typography.display, { color: colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[Typography.caption, { color: colors.textMuted }]}>{subtitle}</Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.xs },
});
