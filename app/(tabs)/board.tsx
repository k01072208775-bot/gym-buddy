import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ChoiceChips } from '@/components/ui/choice-chips';
import { ScreenHeader } from '@/components/ui/screen-header';
import { BOARDS, TRADE_STATUS_LABELS, WORKOUT_SPORTS } from '@/constants/board';
import { Radius, Spacing, Typography, type AppPalette } from '@/constants/theme';
import { usePosts } from '@/features/board/hooks';
import { useAppColors } from '@/hooks/use-app-colors';
import { formatPrice, formatRelativeTime } from '@/lib/format';
import type { BoardType, PostItem } from '@/types/database';

const ALL_SPORTS = '전체';
const SPORT_FILTERS = [ALL_SPORTS, ...WORKOUT_SPORTS].map((sport) => ({ value: sport, label: sport }));

/**
 * 게시판 목록. 상단에서 자유 / 운동 / 장터를 고릅니다.
 * 같은 학교 학생 글만 보이는 조건은 DB의 get_posts 안에 있습니다.
 */
export default function BoardScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const [board, setBoard] = useState<BoardType>('free');
  /** 운동게시판 종목 필터. null = 전체 */
  const [sport, setSport] = useState<string | null>(null);
  const {
    data,
    isPending,
    isRefetching,
    refetch,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePosts(board, board === 'workout' ? sport : null);

  const posts = data?.pages.flat() ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="게시판">
        <View style={styles.boardTabs}>
          {BOARDS.map((item) => {
            const active = item.value === board;
            return (
              <Pressable key={item.value} onPress={() => setBoard(item.value)} hitSlop={8}>
                <Text
                  style={[
                    styles.boardTab,
                    { color: active ? colors.primary : colors.textMuted },
                    active && styles.boardTabActive,
                  ]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScreenHeader>

      {board === 'workout' ? (
        <View style={styles.sportBar}>
          <ChoiceChips
            scroll
            options={SPORT_FILTERS}
            value={sport ?? ALL_SPORTS}
            onChange={(next) => setSport(next === ALL_SPORTS ? null : next)}
          />
        </View>
      ) : null}

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {error
                  ? '불러오지 못했어요.\n당겨서 새로고침 해주세요.'
                  : '아직 글이 없어요.\n첫 글을 남겨보세요!'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <PostRow post={item} colors={colors} onPress={() => router.push(`/board/${item.id}`)} />
          )}
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() =>
          router.push({
            pathname: '/board/write',
            // 종목 필터를 켜둔 채 글을 쓰면 그 종목이 미리 선택된다
            params: board === 'workout' && sport ? { board, sport } : { board },
          })
        }>
        <Text style={[styles.fabText, { color: colors.onPrimary }]}>+ 글쓰기</Text>
      </Pressable>
    </View>
  );
}

function PostRow({
  post,
  colors,
  onPress,
}: {
  post: PostItem;
  colors: AppPalette;
  onPress: () => void;
}) {
  const sold = post.trade_status === 'sold';
  const isMarket = post.board === 'market' && post.price !== null;

  // 제목 위 작은 연두색 라벨: 운동은 종목, 장터는 거래 상태
  const label = post.sport ?? (isMarket && post.trade_status ? TRADE_STATUS_LABELS[post.trade_status] : null);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, { borderTopColor: colors.border }, sold && styles.sold]}>
      <View style={styles.rowText}>
        {label ? (
          <Text style={[Typography.label, { color: sold ? colors.textMuted : colors.primary }]}>
            {label}
          </Text>
        ) : null}

        <Text style={[Typography.heading, { color: colors.text }]} numberOfLines={1}>
          {post.title}
        </Text>

        {isMarket ? (
          <Text style={[styles.price, { color: colors.text }]}>{formatPrice(post.price!)}</Text>
        ) : (
          <Text style={[styles.preview, { color: colors.textMuted }]} numberOfLines={1}>
            {post.body}
          </Text>
        )}

        <Text style={[Typography.caption, { color: colors.textMuted }]}>
          {post.author_nickname} · {formatRelativeTime(post.created_at)}
          {post.like_count > 0 ? ` · 좋아요 ${post.like_count}` : ''}
          {post.comment_count > 0 ? ` · 댓글 ${post.comment_count}` : ''}
        </Text>
      </View>

      {post.image_urls.length > 0 ? (
        <Image source={{ uri: post.image_urls[0] }} style={styles.thumb} contentFit="cover" />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  boardTabs: { flexDirection: 'row', gap: 18, marginTop: Spacing.xs },
  boardTab: { fontSize: 17, fontWeight: '500' },
  boardTabActive: { fontWeight: '800' },
  sportBar: { paddingTop: Spacing.xs, paddingBottom: Spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { textAlign: 'center', lineHeight: 22 },
  list: { paddingBottom: 96, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 3 },
  thumb: { width: 64, height: 64, borderRadius: Radius.md },
  sold: { opacity: 0.5 },
  preview: { fontSize: 14 },
  price: { fontSize: 15, fontWeight: '800' },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    borderRadius: Radius.md,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  fabText: { fontSize: 15, fontWeight: '800' },
});
