import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ReportReasonModal } from '@/components/ui/report-reason-modal';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing, Typography } from '@/constants/theme';
import { CandidateCard } from '@/features/matching/candidate-card';
import { useCandidates, useSwipe } from '@/features/matching/hooks';
import { useMyProfile } from '@/features/profile/hooks';
import { reportAndBlock } from '@/features/safety/api';
import { useAppColors } from '@/hooks/use-app-colors';
import type { Candidate } from '@/types/database';

/**
 * 후보 탐색.
 * 목록을 만드는 조건(같은 학교 / 차단 제외 / 이미 본 사람 제외)은
 * 전부 DB의 get_candidates 안에 있고, 화면은 결과만 그립니다.
 */
export default function DiscoverScreen() {
  const colors = useAppColors();
  const { data, isPending, isRefetching, refetch, error } = useCandidates();
  const { data: me } = useMyProfile();
  const swipe = useSwipe();

  const [reportTarget, setReportTarget] = useState<Candidate | null>(null);

  const mySports = me?.prefs?.sports ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="탐색" subtitle={me ? `${me.university} 학생만 보여요` : undefined} />

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {error
                  ? '불러오지 못했어요.\n당겨서 새로고침 해주세요.'
                  : '지금은 보여드릴 사람이 없어요.\n조금 뒤에 다시 확인해주세요.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <CandidateCard
              candidate={item}
              mySports={mySports}
              onLike={() => handleSwipe(item, 'like')}
              onPass={() => handleSwipe(item, 'pass')}
              onReport={() => setReportTarget(item)}
            />
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

  function handleSwipe(candidate: Candidate, action: 'like' | 'pass') {
    swipe.mutate(
      { toUser: candidate.id, action },
      {
        onSuccess: (result) => {
          if (result.matched) {
            Alert.alert('매칭 성사!', `${candidate.nickname} 님과 서로 관심이 있어요.`);
          }
        },
        onError: (err) => Alert.alert('처리 실패', (err as Error).message),
      }
    );
  }

  async function handleReport(reason: string) {
    if (!reportTarget) return;
    const target = reportTarget;
    setReportTarget(null);

    try {
      await reportAndBlock({ targetId: target.id, reason });
      await refetch();
      Alert.alert('신고가 접수됐어요', '이제 서로에게 보이지 않아요.');
    } catch (err) {
      Alert.alert('신고 실패', (err as Error).message);
    }
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { ...Typography.body, textAlign: 'center' },
  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xl, gap: Spacing.md, flexGrow: 1 },
});
