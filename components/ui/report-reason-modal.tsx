import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { REPORT_REASONS } from '@/constants/workout';
import { useAppColors } from '@/hooks/use-app-colors';

/**
 * 신고 사유 선택 창.
 * Android 의 Alert 는 버튼이 3개까지만 나와서 사유 5개를 담을 수 없어 따로 만들었습니다.
 * 탐색 화면·게시판·채팅 어디서든 같은 창을 쓰세요.
 */
export function ReportReasonModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (reason: string) => void;
}) {
  const colors = useAppColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>신고 사유를 골라주세요</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            신고하면 서로의 글과 댓글이 보이지 않게 차단됩니다.
          </Text>

          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason.value}
              style={[styles.option, { borderTopColor: colors.border }]}
              onPress={() => onSelect(reason.value)}>
              <Text style={[styles.optionText, { color: colors.text }]}>{reason.label}</Text>
            </Pressable>
          ))}

          <Pressable style={[styles.option, { borderTopColor: colors.border }]} onPress={onClose}>
            <Text style={[styles.optionText, styles.cancel, { color: colors.textMuted }]}>취소</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: { borderRadius: 16, paddingTop: 20, overflow: 'hidden' },
  title: { fontSize: 17, fontWeight: '700', paddingHorizontal: 20 },
  subtitle: { fontSize: 13, paddingHorizontal: 20, marginTop: 4, marginBottom: 12 },
  option: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 15, paddingHorizontal: 20 },
  optionText: { fontSize: 15 },
  cancel: { textAlign: 'center' },
});
