import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { ReportReasonModal } from '@/components/ui/report-reason-modal';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useLikesReceived, useMatches, useRefreshMatching } from '@/features/matching/hooks';
import { LikesReceivedSection } from '@/features/matching/likes-received-section';
import { useMyProfile } from '@/features/profile/hooks';
import { reportAndBlock } from '@/features/safety/api';
import { useAppColors } from '@/hooks/use-app-colors';
import { formatRelativeTime } from '@/lib/format';
import type { LikeReceived } from '@/types/database';

export default function MatchesScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const { data, isPending, isRefetching, error } = useMatches();
  const { data: likes } = useLikesReceived();
  const { data: me } = useMyProfile();
  const refreshMatching = useRefreshMatching();
  const [reportTarget, setReportTarget] = useState<LikeReceived | null>(null);

  const hasLikes = !!likes && likes.length > 0;

  async function handleReport(reason: string) {
    if (!reportTarget) return;
    const target = reportTarget;
    setReportTarget(null);

    try {
      await reportAndBlock({ targetId: target.id, reason });
      await refreshMatching();
      Alert.alert('신고가 접수됐어요', '이제 서로에게 보이지 않아요.');
    } catch (err) {
      Alert.alert('신고 실패', (err as Error).message);
    }
  }

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
            <RefreshControl
              refreshing={isRefetching}
              // 받은 관심과 매칭 목록을 함께 새로 불러온다
              onRefresh={refreshMatching}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <>
              <LikesReceivedSection mySports={me?.prefs?.sports ?? []} onReport={setReportTarget} />
              {hasLikes && data && data.length > 0 ? (
                <Text style={[Typography.heading, styles.listTitle, { color: colors.text }]}>
                  매칭된 사람
                </Text>
              ) : null}
            </>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {error
                  ? '불러오지 못했어요.\n당겨서 새로고침 해주세요.'
                  : hasLikes
                    ? '아직 매칭된 사람이 없어요.\n위에서 수락하면 바로 채팅할 수 있어요.'
                    : '아직 매칭된 사람이 없어요.\n탐색 탭에서 마음에 드는 사람을 찾아보세요.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/chat/${item.matchId}`)}
              style={[styles.row, { backgroundColor: colors.card }]}>
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

      <ReportReasonModal
        visible={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        onSelect={handleReport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { ...Typography.body, textAlign: 'center' },
  list: { padding: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.sm, flexGrow: 1 },
  listTitle: { paddingBottom: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  rowText: { flex: 1, gap: 2 },
});
