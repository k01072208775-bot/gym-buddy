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

import { ReportReasonModal } from '@/components/ui/report-reason-modal';
import { useCandidates, useSwipe } from '@/features/matching/hooks';
import { reportAndBlock } from '@/features/safety/api';
import { useAppColors } from '@/hooks/use-app-colors';
import type { AppPalette } from '@/constants/theme';
import type { Candidate } from '@/types/database';

/**
 * 후보 탐색.
 * 목록을 만드는 조건(같은 학교 / 차단 제외 / 이미 본 사람 제외)은
 * 전부 DB의 get_candidates 안에 있고, 화면은 결과만 그립니다.
 */
export default function DiscoverScreen() {
  const colors = useAppColors();
  const { data, isPending, isRefetching, refetch, error } = useCandidates();
  const swipe = useSwipe();

  const [reportTarget, setReportTarget] = useState<Candidate | null>(null);

  if (isPending) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          불러오지 못했어요.{'\n'}당겨서 새로고침 해주세요.
        </Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={{ backgroundColor: colors.background }}
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              지금은 보여드릴 사람이 없어요.{'\n'}조금 뒤에 다시 확인해주세요.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <CandidateCard
            candidate={item}
            colors={colors}
            onLike={() => handleSwipe(item, 'like')}
            onPass={() => handleSwipe(item, 'pass')}
            onReport={() => setReportTarget(item)}
          />
        )}
      />

      <ReportReasonModal
        visible={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        onSelect={handleReport}
      />
    </>
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
  colors,
  onLike,
  onPass,
  onReport,
}: {
  candidate: Candidate;
  colors: AppPalette;
  onLike: () => void;
  onPass: () => void;
  onReport: () => void;
}) {
  const age = new Date().getFullYear() - candidate.birth_year + 1;

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.nickname, { color: colors.text }]}>
          {candidate.nickname} · {age}세
        </Text>
        <Pressable onPress={onReport} hitSlop={12}>
          <Text style={[styles.report, { color: colors.textMuted }]}>신고</Text>
        </Pressable>
      </View>

      <Text style={[styles.meta, { color: colors.textMuted }]}>
        {candidate.university}
        {candidate.gym_name ? ` · ${candidate.gym_name}` : ''}
      </Text>

      <Text style={[styles.tags, { color: colors.text }]}>{candidate.sports.join(' · ')}</Text>
      <Text style={[styles.tags, { color: colors.text }]}>{candidate.time_slots.join(' · ')}</Text>

      {candidate.shared_sports > 0 && (
        <Text style={[styles.match, { color: colors.primary }]}>
          겹치는 운동 {candidate.shared_sports}개
        </Text>
      )}

      {candidate.bio ? (
        <Text style={[styles.bio, { color: colors.text }]}>{candidate.bio}</Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable style={[styles.action, { borderWidth: 1, borderColor: colors.border }]} onPress={onPass}>
          <Text style={[styles.actionText, { color: colors.textMuted }]}>패스</Text>
        </Pressable>
        <Pressable style={[styles.action, { backgroundColor: colors.primary }]} onPress={onLike}>
          <Text style={[styles.actionText, { color: colors.onPrimary }]}>같이 운동해요</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { textAlign: 'center', lineHeight: 22 },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nickname: { fontSize: 18, fontWeight: '700' },
  report: { fontSize: 13 },
  meta: { fontSize: 14 },
  tags: { fontSize: 14 },
  match: { fontSize: 13, fontWeight: '600' },
  bio: { fontSize: 14, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  action: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  actionText: { fontWeight: '600' },
});
