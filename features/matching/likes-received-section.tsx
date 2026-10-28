import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { confirmMessage, showMessage } from '@/lib/dialog';
import { useAppColors } from '@/hooks/use-app-colors';
import { formatRelativeTime } from '@/lib/format';
import type { LikeReceived } from '@/types/database';
import { CandidateCard } from './candidate-card';
import { useLikesReceived, useSwipe } from './hooks';

/**
 * 매칭 탭 맨 위: 나에게 '같이 운동해요'를 보낸 사람들.
 * 수락하면 바로 매칭되어 채팅으로 갈 수 있고, 거절해도 상대에게는 알리지 않습니다.
 * 받은 관심이 없으면 아무것도 그리지 않습니다.
 *
 * 신고는 features/safety 의 일이라 여기서 직접 부르지 않고 화면(app/)에 넘깁니다
 * (features 끼리 import 하지 않는 규칙).
 */
export function LikesReceivedSection({
  mySports,
  onReport,
}: {
  mySports: string[];
  onReport: (person: LikeReceived) => void;
}) {
  const colors = useAppColors();
  const router = useRouter();
  const { data: likes, error } = useLikesReceived();
  const swipe = useSwipe();

  function handleAccept(person: LikeReceived) {
    swipe.mutate(
      { toUser: person.id, action: 'like' },
      {
        onSuccess: (result) => {
          if (!result.matched || result.matchId === undefined) return;
          const matchId = result.matchId;
          confirmMessage({
            title: '매칭 성사!',
            message: `${person.nickname} 님과 이제 채팅할 수 있어요.`,
            confirmLabel: '채팅하기',
          }).then((go) => {
            if (go) router.push(`/chat/${matchId}`);
          });
        },
        onError: (err) => showMessage('수락 실패', (err as Error).message),
      }
    );
  }

  function handleDecline(person: LikeReceived) {
    swipe.mutate(
      { toUser: person.id, action: 'pass' },
      { onError: (err) => showMessage('처리 실패', (err as Error).message) }
    );
  }

  if (error) {
    return (
      <Text style={[Typography.caption, styles.error, { color: colors.danger }]}>
        받은 관심을 불러오지 못했어요. 당겨서 새로고침 해주세요.
      </Text>
    );
  }

  if (!likes || likes.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[Typography.heading, { color: colors.text }]}>
        나에게 관심 보낸 사람{' '}
        <Text style={{ color: colors.primary }}>{likes.length}</Text>
      </Text>

      {likes.map((person) => (
        <CandidateCard
          key={person.id}
          candidate={person}
          mySports={mySports}
          note={`${formatRelativeTime(person.liked_at)} 같이 운동하자고 했어요`}
          passLabel="괜찮아요"
          likeLabel="같이 운동해요"
          onLike={() => handleAccept(person)}
          onPass={() => handleDecline(person)}
          onReport={() => onReport(person)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xl, gap: Spacing.md },
  error: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
});
