import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Radius } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';

/**
 * 기능과 무관한 공용 버튼.
 * features/ 안에 두면 다른 기능에서 쓸 때 교차 의존이 생기므로 여기에 둡니다.
 */
export function PrimaryButton({
  label,
  onPress,
  busy = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const colors = useAppColors();
  const inactive = busy || disabled;

  return (
    <Pressable
      style={[styles.button, { backgroundColor: colors.primary }, inactive && styles.disabled]}
      onPress={onPress}
      disabled={inactive}>
      {busy ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <Text style={[styles.text, { color: colors.onPrimary }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center' },
  disabled: { opacity: 0.4 },
  text: { fontSize: 16, fontWeight: '800' },
});
