import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { TagRow } from '@/components/ui/tag';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { EXPERIENCE_LABELS, GENDER_LABELS } from '@/constants/workout';
import { useAppColors } from '@/hooks/use-app-colors';
import type { Candidate } from '@/types/database';

/**
 * 한 사람의 운동 프로필 카드.
 * 탐색 탭(후보)과 매칭 탭의 받은 관심이 같은 카드를 씁니다.
 */
export function CandidateCard({
  candidate,
  mySports,
  note,
  passLabel = '패스',
  likeLabel = '같이 운동해요',
  onLike,
  onPass,
  onReport,
}: {
  candidate: Candidate;
  /** 내 운동 종목. 겹치는 태그를 연두색으로 칠하는 데 씁니다 */
  mySports: string[];
  /** 카드 맨 위의 연두색 안내 줄 (예: "3시간 전에 관심을 보냈어요") */
  note?: string;
  passLabel?: string;
  likeLabel?: string;
  onLike: () => void;
  onPass: () => void;
  onReport: () => void;
}) {
  const colors = useAppColors();
  const age = new Date().getFullYear() - candidate.birth_year + 1;
  const place = [EXPERIENCE_LABELS[candidate.experience], candidate.gym_name]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {note ? <Text style={[Typography.label, { color: colors.primary }]}>{note}</Text> : null}

      <View style={styles.header}>
        <Avatar url={candidate.avatar_url} name={candidate.nickname} size={56} />
        <View style={styles.who}>
          <Text style={[Typography.title, { color: colors.text }]} numberOfLines={1}>
            {candidate.nickname}
            <Text style={[Typography.body, { color: colors.textMuted }]}>
              {`  ${age}세 · ${GENDER_LABELS[candidate.gender]}`}
            </Text>
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
          <Text style={[styles.actionText, { color: colors.text }]}>{passLabel}</Text>
        </Pressable>
        <Pressable style={[styles.action, styles.like, { backgroundColor: colors.primary }]} onPress={onLike}>
          <Text style={[styles.actionText, { color: colors.onPrimary }]}>{likeLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  who: { flex: 1, gap: 2 },
  report: { alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  action: { borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  pass: { flex: 1 },
  like: { flex: 2 },
  actionText: { fontSize: 16, fontWeight: '800' },
});
