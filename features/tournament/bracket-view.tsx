import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';
import type { BracketMatch } from '@/types/database';

/** 마지막 라운드가 결승, 그 앞이 4강 … */
function roundLabel(round: number, lastRound: number): string {
  const fromEnd = lastRound - round;
  if (fromEnd === 0) return '결승';
  if (fromEnd === 1) return '4강';
  if (fromEnd === 2) return '8강';
  if (fromEnd === 3) return '16강';
  return `${round}라운드`;
}

/**
 * 대진표. 라운드별로 위에서 아래로 쌓아 보여줍니다.
 * 가로로 뻗는 토너먼트 그림은 폰 화면에서 글씨가 너무 작아집니다.
 */
export function BracketView({
  matches,
  onPressMatch,
}: {
  matches: BracketMatch[];
  /** 주최자일 때만 넘깁니다. 결과를 넣을 수 있는 경기만 눌립니다 */
  onPressMatch?: (match: BracketMatch) => void;
}) {
  const colors = useAppColors();

  if (matches.length === 0) return null;

  const lastRound = Math.max(...matches.map((match) => match.round));
  const rounds = Array.from(new Set(matches.map((match) => match.round))).sort((a, b) => a - b);

  return (
    <View style={styles.wrap}>
      {rounds.map((round) => (
        <View key={round} style={styles.round}>
          <Text style={[Typography.label, { color: colors.textMuted }]}>
            {roundLabel(round, lastRound)}
          </Text>

          {matches
            .filter((match) => match.round === round)
            .map((match) => {
              // 두 자리가 다 차야 결과를 넣을 수 있습니다 (부전승은 이미 승자가 있음)
              const ready = match.player_a !== null && match.player_b !== null;
              const editable = !!onPressMatch && ready;

              return (
                <Pressable
                  key={match.match_id}
                  disabled={!editable}
                  onPress={() => onPressMatch?.(match)}
                  style={[styles.match, { backgroundColor: colors.card }]}>
                  <Side
                    name={match.name_a}
                    score={match.score_a}
                    won={match.winner !== null && match.winner === match.player_a}
                    lost={match.winner !== null && match.winner !== match.player_a}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <Side
                    name={
                      match.player_b === null
                        ? // 승자가 이미 정해졌는데 상대가 없으면 부전승,
                          // 아직 정해지지 않았으면 앞 경기를 기다리는 자리
                          match.winner !== null
                          ? '부전승'
                          : null
                        : match.name_b
                    }
                    score={match.score_b}
                    won={match.winner !== null && match.winner === match.player_b}
                    lost={match.winner !== null && match.winner !== match.player_b}
                  />

                  {editable && match.winner === null ? (
                    <Text style={[Typography.caption, styles.hint, { color: colors.primary }]}>
                      눌러서 결과 입력
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
        </View>
      ))}
    </View>
  );
}

function Side({
  name,
  score,
  won,
  lost,
}: {
  name: string | null;
  score: number | null;
  won: boolean;
  lost: boolean;
}) {
  const colors = useAppColors();

  return (
    <View style={styles.side}>
      <Text
        style={[
          Typography.body,
          { color: name === null ? colors.textMuted : colors.text },
          won && styles.winner,
          lost && styles.loser,
        ]}
        numberOfLines={1}>
        {name ?? '대기'}
      </Text>
      {score !== null ? (
        <Text style={[Typography.body, { color: colors.textMuted }]}>{score}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xl },
  round: { gap: Spacing.sm },
  match: { borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  side: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, paddingVertical: 6 },
  divider: { height: StyleSheet.hairlineWidth },
  winner: { fontWeight: '800' },
  loser: { opacity: 0.45 },
  hint: { marginTop: Spacing.xs },
});
