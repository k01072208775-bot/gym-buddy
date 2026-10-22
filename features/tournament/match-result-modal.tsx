import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';
import type { BracketMatch } from '@/types/database';

/**
 * 경기 결과 입력. 주최자가 대진표에서 경기를 누르면 열립니다.
 * 점수는 선택입니다 — 현장에서 이긴 사람만 찍고 넘어가는 경우가 더 많습니다.
 */
export function MatchResultModal({
  match,
  busy,
  onClose,
  onSubmit,
}: {
  /** null 이면 닫힌 상태 */
  match: BracketMatch | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: { winner: number; scoreA: number | null; scoreB: number | null }) => void;
}) {
  const colors = useAppColors();
  const [winner, setWinner] = useState<number | null>(null);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');

  // 다른 경기를 열 때마다 입력칸을 그 경기 값으로 되돌립니다
  useEffect(() => {
    setWinner(match?.winner ?? null);
    setScoreA(match?.score_a != null ? String(match.score_a) : '');
    setScoreB(match?.score_b != null ? String(match.score_b) : '');
  }, [match]);

  const scoreStyle = [styles.score, { color: colors.text, backgroundColor: colors.chip }];

  return (
    <Modal visible={match !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* 안쪽을 눌렀을 때 닫히지 않도록 */}
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <Text style={[Typography.heading, { color: colors.text }]}>이긴 사람을 골라주세요</Text>

          {match ? (
            <>
              {[
                { id: match.player_a, name: match.name_a, score: scoreA, setScore: setScoreA },
                { id: match.player_b, name: match.name_b, score: scoreB, setScore: setScoreB },
              ].map((side) =>
                side.id === null ? null : (
                  <View key={side.id} style={styles.row}>
                    <Pressable
                      onPress={() => setWinner(side.id)}
                      style={[
                        styles.choice,
                        {
                          backgroundColor: winner === side.id ? colors.primary : colors.chip,
                        },
                      ]}>
                      <Text
                        style={[
                          Typography.body,
                          { color: winner === side.id ? colors.onPrimary : colors.text },
                          winner === side.id && styles.chosen,
                        ]}
                        numberOfLines={1}>
                        {side.name}
                      </Text>
                    </Pressable>

                    <TextInput
                      style={scoreStyle}
                      value={side.score}
                      onChangeText={(text) => side.setScore(text.replace(/[^0-9]/g, '').slice(0, 3))}
                      placeholder="점수"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                )
              )}

              <Text style={[Typography.caption, { color: colors.textMuted }]}>
                점수는 비워둬도 됩니다.
              </Text>

              <View style={styles.actions}>
                <Pressable
                  style={[styles.action, { backgroundColor: colors.chip }]}
                  onPress={onClose}>
                  <Text style={[styles.actionText, { color: colors.text }]}>취소</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.action,
                    styles.submit,
                    { backgroundColor: colors.primary },
                    (winner === null || busy) && styles.disabled,
                  ]}
                  disabled={winner === null || busy}
                  onPress={() =>
                    winner !== null &&
                    onSubmit({
                      winner,
                      scoreA: scoreA === '' ? null : Number(scoreA),
                      scoreB: scoreB === '' ? null : Number(scoreB),
                    })
                  }>
                  <Text style={[styles.actionText, { color: colors.onPrimary }]}>저장</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  sheet: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  choice: { flex: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 14 },
  chosen: { fontWeight: '800' },
  score: {
    width: 72,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    textAlign: 'center',
    ...Typography.body,
  },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  action: { flex: 1, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  submit: { flex: 2 },
  disabled: { opacity: 0.4 },
  actionText: { fontSize: 15, fontWeight: '800' },
});
