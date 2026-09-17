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
import { TagRow } from '@/components/ui/tag';
import { Radius, Spacing, Typography, type AppPalette } from '@/constants/theme';
import { EXPERIENCE_LABELS } from '@/constants/workout';
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
              colors={colors}
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

function CandidateCard({
  candidate,
  mySports,
  colors,
  onLike,
  onPass,
  onReport,
}: {
  candidate: Candidate;
  mySports: string[];
  colors: AppPalette;
  onLike: () => void;
  onPass: () => void;
  onReport: () => void;
}) {
  const age = new Date().getFullYear() - candidate.birth_year + 1;
  const place = [EXPERIENCE_LABELS[candidate.experience], candidate.gym_name]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <Avatar url={candidate.avatar_url} name={candidate.nickname} size={56} />
        <View style={styles.who}>
          <Text style={[Typography.title, { color: colors.text }]} numberOfLines={1}>
            {candidate.nickname}
            <Text style={[Typography.body, { color: colors.textMuted }]}>  {age}세</Text>
          </Text>
          <Text style={[Typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
            {place}
          </Text>
        </View>
        <Pressable onPress={onReport} hitSlop={12} style={styles.report}>
          <Text style={[Typography.caption, { color: colors.textMuted }]}>신고</Text>
        </Pressable>
      </View>

      {candidate.shared_sports > 0 ? (
        <Text style={[Typography.label, { color: colors.primary }]}>
          겹치는 운동 {candidate.shared_sports}개
        </Text>
      ) : null}

      {/* 나와 겹치는 종목은 연두색으로 칠해서 숫자만 보고 뭔지 모르는 일이 없게 한다 */}
      <TagRow labels={candidate.sports} highlight={mySports} />

      <Text style={[Typography.caption, { color: colors.textMuted }]}>
        {candidate.time_slots.join(' · ')}
      </Text>

      {candidate.bio ? (
        <Text style={[Typography.body, { color: colors.text }]}>{candidate.bio}</Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable style={[styles.action, styles.pass, { backgroundColor: colors.chip }]} onPress={onPass}>
          <Text style={[styles.actionText, { color: colors.text }]}>패스</Text>
        </Pressable>
        <Pressable style={[styles.action, styles.like, { backgroundColor: colors.primary }]} onPress={onLike}>
          <Text style={[styles.actionText, { color: colors.onPrimary }]}>같이 운동해요</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { ...Typography.body, textAlign: 'center' },
  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xl, gap: Spacing.md, flexGrow: 1 },
  card: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  who: { flex: 1, gap: 2 },
  report: { alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  action: { borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  pass: { flex: 1 },
  like: { flex: 2 },
  actionText: { fontSize: 16, fontWeight: '800' },
});
