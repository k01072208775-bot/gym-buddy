import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Stepper } from '@/components/ui/stepper';
import { confirmMessage, showMessage } from '@/lib/dialog';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { BracketView } from '@/features/tournament/bracket-view';
import {
  useAddPlayer,
  useBracket,
  useBuildBracket,
  useDeleteTournament,
  useRemovePlayer,
  useSetCapacity,
  useSetMatchResult,
  useTournamentPlayers,
  useTournaments,
} from '@/features/tournament/hooks';
import { MatchResultModal } from '@/features/tournament/match-result-modal';
import { useAppColors } from '@/hooks/use-app-colors';
import type { BracketMatch } from '@/types/database';

export default function TournamentDetailScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const tournamentId = Number(rawId);

  // 목록을 이미 받아뒀으므로 거기서 찾습니다 (추가 요청 없음)
  const { data: tournaments } = useTournaments();
  const tournament = tournaments?.find((item) => item.id === tournamentId);

  const { data: players } = useTournamentPlayers(tournamentId);
  const { data: bracket } = useBracket(tournamentId);

  const addPlayer = useAddPlayer(tournamentId);
  const removePlayer = useRemovePlayer(tournamentId);
  const buildBracket = useBuildBracket(tournamentId);
  const setResult = useSetMatchResult(tournamentId);
  const deleteTournament = useDeleteTournament();
  const setCapacity = useSetCapacity(tournamentId);

  const [name, setName] = useState('');
  const [editing, setEditing] = useState<BracketMatch | null>(null);

  const isHost = tournament?.is_host ?? false;
  const hasBracket = !!bracket && bracket.length > 0;
  const playerCount = players?.length ?? 0;
  const capacity = tournament?.capacity ?? null;
  const isFull = capacity !== null && playerCount >= capacity;

  function handleAddPlayer() {
    const trimmed = name.trim();
    if (!trimmed || addPlayer.isPending || isFull) return;
    addPlayer.mutate(trimmed, {
      onSuccess: () => setName(''),
      onError: (error) => showMessage('추가 실패', (error as Error).message),
    });
  }

  async function handleBuildBracket() {
    const count = players?.length ?? 0;
    const ok = await confirmMessage({
      title: hasBracket ? '대진표를 다시 만들까요?' : '대진표를 만들까요?',
      message: hasBracket
        ? `지금까지 입력한 경기 결과가 모두 지워집니다. (참가자 ${count}명)`
        : `참가자 ${count}명으로 대진을 짭니다. 인원이 2·4·8명이 아니면 부전승이 생깁니다.`,
      confirmLabel: hasBracket ? '다시 만들기' : '만들기',
      destructive: hasBracket,
    });
    if (!ok) return;

    buildBracket.mutate(undefined, {
      onError: (error) => showMessage('실패', (error as Error).message),
    });
  }

  async function confirmDelete() {
    const ok = await confirmMessage({
      title: '대회를 삭제할까요?',
      message: '참가자와 경기 기록도 함께 사라지고 되돌릴 수 없어요.',
      confirmLabel: '삭제',
      destructive: true,
    });
    if (!ok) return;

    deleteTournament.mutate(tournamentId, {
      onSuccess: () => router.back(),
      onError: (error) => showMessage('삭제 실패', (error as Error).message),
    });
  }

  if (!tournament) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: '대회' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 44}>
      <Stack.Screen
        options={{
          title: tournament.sport,
          headerRight: () =>
            isHost ? (
              <Pressable onPress={confirmDelete} hitSlop={12}>
                <Text style={[Typography.body, { color: colors.danger }]}>삭제</Text>
              </Pressable>
            ) : null,
        }}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[Typography.title, { color: colors.text }]}>{tournament.title}</Text>
          <Text style={[Typography.caption, { color: colors.textMuted }]}>
            {[
              tournament.venue,
              capacity === null
                ? `참가 ${playerCount}명`
                : `참가 ${playerCount}/${capacity}명`,
              `주최 ${tournament.host_nickname}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>

        {isHost ? (
          <View style={styles.section}>
            <Text style={[Typography.label, { color: colors.textMuted }]}>참가 정원</Text>
            {capacity === null ? (
              <Pressable
                style={[styles.limitToggle, { backgroundColor: colors.chip }]}
                onPress={() => setCapacity.mutate(Math.max(playerCount, 2))}>
                <Text style={[Typography.body, { color: colors.text }]}>
                  제한 없음 · 눌러서 정원 정하기
                </Text>
              </Pressable>
            ) : (
              <View style={styles.limitRow}>
                <Stepper
                  value={capacity}
                  onChange={(next) => setCapacity.mutate(next)}
                  min={2}
                  max={64}
                  format={(n) => n + '명'}
                />
                <Pressable onPress={() => setCapacity.mutate(null)} hitSlop={8}>
                  <Text style={[Typography.caption, { color: colors.textMuted }]}>제한 없애기</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : null}

        {isHost ? (
          <View style={styles.section}>
            <Text style={[Typography.label, { color: colors.textMuted }]}>참가자 추가</Text>
            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
                value={name}
                onChangeText={setName}
                placeholder={isFull ? '정원이 찼어요' : '이름'}
                placeholderTextColor={colors.textMuted}
                editable={!isFull}
                maxLength={20}
                onSubmitEditing={handleAddPlayer}
                returnKeyType="done"
              />
              <Pressable
                style={[
                  styles.add,
                  { backgroundColor: colors.primary },
                  (!name.trim() || addPlayer.isPending || isFull) && styles.disabled,
                ]}
                disabled={!name.trim() || addPlayer.isPending || isFull}
                onPress={handleAddPlayer}>
                <Text style={[styles.addText, { color: colors.onPrimary }]}>추가</Text>
              </Pressable>
            </View>
            <Text style={[Typography.caption, { color: isFull ? colors.danger : colors.textMuted }]}>
              {isFull
                ? '정원이 찼어요. 더 받으려면 위에서 정원을 늘리세요.'
                : '앱을 쓰지 않는 사람도 이름만으로 참가할 수 있어요.'}
            </Text>
          </View>
        ) : null}

        {players && players.length > 0 ? (
          <View style={styles.section}>
            <Text style={[Typography.label, { color: colors.textMuted }]}>
              참가자 {capacity === null ? `${players.length}명` : `${players.length}/${capacity}명`}
            </Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {players.map((player, index) => (
                <View
                  key={player.id}
                  style={[
                    styles.playerRow,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                  ]}>
                  <Text style={[Typography.body, { color: colors.text }]}>{player.name}</Text>
                  {isHost ? (
                    <Pressable onPress={() => removePlayer.mutate(player.id)} hitSlop={10}>
                      <Text style={[Typography.caption, { color: colors.textMuted }]}>삭제</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {isHost ? (
          <Pressable
            style={[
              styles.build,
              { backgroundColor: hasBracket ? colors.chip : colors.primary },
              ((players?.length ?? 0) < 2 || buildBracket.isPending) && styles.disabled,
            ]}
            disabled={(players?.length ?? 0) < 2 || buildBracket.isPending}
            onPress={handleBuildBracket}>
            <Text
              style={[
                styles.buildText,
                { color: hasBracket ? colors.text : colors.onPrimary },
              ]}>
              {hasBracket ? '대진표 다시 만들기' : '대진표 만들기'}
            </Text>
          </Pressable>
        ) : null}

        {hasBracket ? (
          <BracketView
            matches={bracket}
            onPressMatch={isHost ? (match) => setEditing(match) : undefined}
          />
        ) : (
          <Text style={[Typography.body, styles.empty, { color: colors.textMuted }]}>
            {isHost
              ? '참가자를 2명 이상 추가하면 대진표를 만들 수 있어요.'
              : '아직 대진표가 나오지 않았어요.'}
          </Text>
        )}
      </ScrollView>

      <MatchResultModal
        match={editing}
        busy={setResult.isPending}
        onClose={() => setEditing(null)}
        onSubmit={(input) => {
          if (!editing) return;
          setResult.mutate(
            { matchId: editing.match_id, ...input },
            {
              onSuccess: () => setEditing(null),
              onError: (error) => showMessage('저장 실패', (error as Error).message),
            }
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, gap: Spacing.xl },
  card: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.xs },
  section: { gap: Spacing.sm },
  limitToggle: { borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: 14 },
  limitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  addRow: { flexDirection: 'row', gap: Spacing.sm },
  input: {
    flex: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    ...Typography.body,
  },
  add: { borderRadius: Radius.md, paddingHorizontal: Spacing.lg, justifyContent: 'center' },
  addText: { fontSize: 15, fontWeight: '800' },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  build: { borderRadius: Radius.md, paddingVertical: 15, alignItems: 'center' },
  buildText: { fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.4 },
  empty: { textAlign: 'center', paddingVertical: Spacing.xl },
});
