import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTournaments } from '@/features/tournament/hooks';
import { useAppColors } from '@/hooks/use-app-colors';
import { formatRelativeTime } from '@/lib/format';
import type { TournamentStatus } from '@/types/database';

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: '참가자 모집 중',
  ongoing: '경기 중',
  finished: '종료',
};

export default function TournamentsScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const { data, isPending, isRefetching, refetch, error } = useTournaments();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="대회" subtitle="우리 학교에서 열리는 대회" />

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {error
                  ? '불러오지 못했어요.\n당겨서 새로고침 해주세요.'
                  : '아직 열린 대회가 없어요.\n아래 버튼으로 대회를 만들어보세요.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/tournament/${item.id}`)}
              style={[styles.row, { backgroundColor: colors.card }]}>
              <View style={styles.rowTop}>
                <Text style={[Typography.label, { color: colors.primary }]}>{item.sport}</Text>
                <Text style={[Typography.caption, { color: colors.textMuted }]}>
                  {STATUS_LABELS[item.status]}
                </Text>
              </View>

              <Text style={[Typography.heading, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>

              <Text style={[Typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
                {[item.venue, `참가 ${item.player_count}명`, `${item.host_nickname} · ${formatRelativeTime(item.created_at)}`]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Pressable>
          )}
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/tournament/new')}>
        <Text style={[styles.fabText, { color: colors.onPrimary }]}>+ 대회 만들기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { ...Typography.body, textAlign: 'center' },
  list: { padding: Spacing.lg, paddingBottom: 110, gap: Spacing.sm, flexGrow: 1 },
  row: { borderRadius: Radius.lg, padding: Spacing.md, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: Spacing.xl,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
  },
  fabText: { fontSize: 15, fontWeight: '800' },
});
