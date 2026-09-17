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

import { Avatar } from '@/components/ui/avatar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing, Typography } from '@/constants/theme';
import { useMatches } from '@/features/matching/hooks';
import { useAppColors } from '@/hooks/use-app-colors';
import { formatRelativeTime } from '@/lib/format';

export default function MatchesScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const { data, isPending, isRefetching, refetch, error } = useMatches();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="매칭"
        subtitle={data && data.length > 0 ? `서로 관심 있는 사람 ${data.length}명` : undefined}
      />

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => String(item.matchId)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {error
                  ? '불러오지 못했어요.\n당겨서 새로고침 해주세요.'
                  : '아직 매칭된 사람이 없어요.\n탐색 탭에서 마음에 드는 사람을 찾아보세요.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/chat/${item.matchId}`)}
              style={[styles.row, { borderTopColor: colors.border }]}>
              <Avatar url={item.partner.avatar_url} name={item.partner.nickname} size={52} />
              <View style={styles.rowText}>
                <Text style={[Typography.heading, { color: colors.text }]} numberOfLines={1}>
                  {item.partner.nickname}
                </Text>
                <Text style={[Typography.caption, { color: colors.textMuted }]}>
                  {formatRelativeTime(item.matchedAt)} 매칭
                </Text>
              </View>
              <Text style={[Typography.label, { color: colors.primary }]}>채팅 ›</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { ...Typography.body, textAlign: 'center' },
  list: { paddingBottom: Spacing.xl, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
});
