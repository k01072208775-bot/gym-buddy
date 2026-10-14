import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ReportReasonModal } from '@/components/ui/report-reason-modal';
import { BOARD_LABELS, TRADE_STATUSES, TRADE_STATUS_LABELS } from '@/constants/board';
import { Radius, Spacing, Typography } from '@/constants/theme';
import {
  useAddComment,
  useComments,
  useParticipants,
  useToggleJoin,
  useDeleteComment,
  useDeletePost,
  usePost,
  useRefreshBoard,
  useSetTradeStatus,
  useToggleLike,
} from '@/features/board/hooks';
import { PostImage } from '@/features/board/post-image';
import { reportAndBlock } from '@/features/safety/api';
import { useAppColors } from '@/hooks/use-app-colors';
import { formatPrice, formatRelativeTime } from '@/lib/format';
import type { CommentItem } from '@/types/database';

type ReportTarget = { authorId: string; postId?: number; commentId?: number };

export default function PostDetailScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const { postId: rawPostId } = useLocalSearchParams<{ postId: string }>();
  const postId = Number(rawPostId);

  const { data: post, isPending } = usePost(postId);
  const { data: comments } = useComments(postId);
  const toggleLike = useToggleLike();
  const toggleJoin = useToggleJoin();
  const { data: participants } = useParticipants(postId);
  const deletePost = useDeletePost();
  const setTradeStatus = useSetTradeStatus();
  const addComment = useAddComment(postId);
  const deleteComment = useDeleteComment(postId);
  const refreshBoard = useRefreshBoard();

  const [draft, setDraft] = useState('');
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  if (isPending) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>삭제되었거나 볼 수 없는 글이에요.</Text>
      </View>
    );
  }

  function openPostMenu() {
    if (!post) return;
    if (!post.is_mine) {
      setReportTarget({ authorId: post.author_id, postId: post.id });
      return;
    }
    Alert.alert('내 글', undefined, [
      {
        text: '수정',
        onPress: () =>
          router.push({ pathname: '/board/write', params: { postId: String(post.id) } }),
      },
      { text: '삭제', style: 'destructive', onPress: confirmDeletePost },
      { text: '취소', style: 'cancel' },
    ]);
  }

  function confirmDeletePost() {
    Alert.alert('글을 삭제할까요?', '댓글도 함께 삭제되고 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          deletePost.mutate(postId, {
            onSuccess: () => router.back(),
            onError: (err) => Alert.alert('삭제 실패', (err as Error).message),
          }),
      },
    ]);
  }

  function openCommentMenu(comment: CommentItem) {
    if (!comment.is_mine) {
      setReportTarget({ authorId: comment.author_id, commentId: comment.id });
      return;
    }
    Alert.alert('댓글을 삭제할까요?', undefined, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          deleteComment.mutate(comment.id, {
            onError: (err) => Alert.alert('삭제 실패', (err as Error).message),
          }),
      },
    ]);
  }

  async function handleReport(reason: string) {
    if (!reportTarget) return;
    const target = reportTarget;
    setReportTarget(null);

    try {
      await reportAndBlock({
        targetId: target.authorId,
        reason,
        postId: target.postId,
        commentId: target.commentId,
      });
      await refreshBoard();
      Alert.alert('신고가 접수됐어요', '이제 서로의 글과 댓글이 보이지 않아요.');
      // 글 작성자를 차단했다면 이 글은 더 이상 볼 수 없으므로 목록으로 돌아간다
      if (target.authorId === post?.author_id) router.back();
    } catch (err) {
      Alert.alert('신고 실패', (err as Error).message);
    }
  }

  function handleSendComment() {
    const body = draft.trim();
    if (!body || addComment.isPending) return;
    addComment.mutate(body, {
      onSuccess: () => setDraft(''),
      onError: (err) => Alert.alert('댓글 등록 실패', (err as Error).message),
    });
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.card }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <Stack.Screen
        options={{
          title: BOARD_LABELS[post.board],
          headerRight: () => (
            <Pressable onPress={openPostMenu} hitSlop={12}>
              <Text style={[Typography.body, { color: colors.primary }]}>
                {post.is_mine ? '관리' : '신고'}
              </Text>
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={comments ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={[styles.post, { borderBottomColor: colors.border }]}>
            {post.sport ? (
              <Text style={[Typography.label, { color: colors.primary }]}>{post.sport}</Text>
            ) : null}
            <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>
            <Text style={[Typography.caption, { color: colors.textMuted }]}>
              {post.author_nickname} · {formatRelativeTime(post.created_at)}
              {post.updated_at !== post.created_at ? ' · 수정됨' : ''}
            </Text>

            {post.board === 'market' && post.price !== null && post.trade_status ? (
              <View style={styles.market}>
                <Text style={[styles.price, { color: colors.text }]}>{formatPrice(post.price)}</Text>
                <View style={styles.statusRow}>
                  {TRADE_STATUSES.map((status) => {
                    const active = status === post.trade_status;
                    // 남의 글이면 현재 상태만 보여주고, 내 글이면 눌러서 바꿀 수 있다
                    if (!post.is_mine && !active) return null;
                    return (
                      <Pressable
                        key={status}
                        disabled={!post.is_mine || active || setTradeStatus.isPending}
                        onPress={() =>
                          setTradeStatus.mutate(
                            { postId: post.id, status },
                            { onError: (err) => Alert.alert('변경 실패', (err as Error).message) }
                          )
                        }
                        style={[
                          styles.status,
                          { backgroundColor: active ? colors.primary : colors.chip },
                        ]}>
                        <Text
                          style={[
                            Typography.label,
                            { color: active ? colors.onPrimary : colors.textMuted },
                          ]}>
                          {TRADE_STATUS_LABELS[status]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {post.capacity !== null ? (
              <View style={[styles.recruit, { backgroundColor: colors.background }]}>
                <View style={styles.recruitHead}>
                  <Text style={[Typography.heading, { color: colors.text }]}>
                    모집 {post.joined_count}/{post.capacity}명
                  </Text>
                  {post.joined_count >= post.capacity ? (
                    <Text style={[Typography.label, { color: colors.textMuted }]}>마감</Text>
                  ) : (
                    <Text style={[Typography.label, { color: colors.primary }]}>
                      {post.capacity - post.joined_count}자리 남음
                    </Text>
                  )}
                </View>

                {/* 글쓴이도 운동하러 가는 사람이므로 명단 맨 앞에 둔다 */}
                <Text style={[Typography.caption, { color: colors.textMuted }]}>
                  {[post.author_nickname + '(글쓴이)']
                    .concat((participants ?? []).map((person) => person.nickname))
                    .join(' · ')}
                </Text>

                {/* 글쓴이는 주최자라 자기 글에 참여하지 않는다 */}
                {post.is_mine ? null : (
                  <Pressable
                    style={[
                      styles.joinButton,
                      {
                        backgroundColor: post.joined_by_me ? colors.chip : colors.primary,
                      },
                      !post.joined_by_me &&
                        post.joined_count >= post.capacity &&
                        styles.joinDisabled,
                    ]}
                    disabled={
                      toggleJoin.isPending ||
                      (!post.joined_by_me && post.joined_count >= post.capacity)
                    }
                    onPress={() =>
                      toggleJoin.mutate(
                        { postId: post.id, joined: !post.joined_by_me },
                        {
                          onError: (err) =>
                            Alert.alert('처리 실패', (err as Error).message),
                        }
                      )
                    }>
                    <Text
                      style={[
                        styles.joinText,
                        { color: post.joined_by_me ? colors.text : colors.onPrimary },
                      ]}>
                      {post.joined_by_me
                        ? '참여 취소'
                        : post.joined_count >= post.capacity
                          ? '자리가 찼어요'
                          : '참여하기'}
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : null}

            {post.image_urls.length > 0 ? (
              <View style={styles.images}>
                {post.image_urls.map((url) => (
                  <PostImage key={url} url={url} />
                ))}
              </View>
            ) : null}

            <Text style={[styles.body, { color: colors.text }]}>{post.body}</Text>

            <View style={styles.actions}>
              <Pressable
                style={[
                  styles.like,
                  { backgroundColor: post.liked_by_me ? colors.primary : colors.chip },
                ]}
                disabled={toggleLike.isPending}
                onPress={() => toggleLike.mutate({ postId: post.id, liked: !post.liked_by_me })}>
                <Text
                  style={[
                    Typography.label,
                    { color: post.liked_by_me ? colors.onPrimary : colors.textMuted },
                  ]}>
                  {post.liked_by_me ? '♥' : '♡'} 좋아요 {post.like_count}
                </Text>
              </Pressable>
              <Text style={[Typography.caption, { color: colors.textMuted }]}>
                댓글 {post.comment_count}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          comments ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              첫 댓글을 남겨보세요.
            </Text>
          ) : (
            <ActivityIndicator style={styles.empty} color={colors.primary} />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => openCommentMenu(item)}
            style={[styles.comment, { borderBottomColor: colors.border }]}>
            <View style={styles.commentHeader}>
              <Text style={[Typography.label, { color: colors.text }]}>
                {item.author_nickname}
                {item.author_id === post.author_id ? ' (글쓴이)' : ''}
              </Text>
              <Pressable onPress={() => openCommentMenu(item)} hitSlop={10}>
                <Text style={[Typography.caption, { color: colors.textMuted }]}>
                  {item.is_mine ? '삭제' : '신고'}
                </Text>
              </Pressable>
            </View>
            <Text style={[Typography.body, { color: colors.text }]}>{item.body}</Text>
            <Text style={[Typography.caption, { color: colors.textMuted }]}>
              {formatRelativeTime(item.created_at)}
            </Text>
          </Pressable>
        )}
      />

      <View style={[styles.composer, { borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
          value={draft}
          onChangeText={setDraft}
          placeholder="댓글 입력"
          placeholderTextColor={colors.textMuted}
          maxLength={1000}
          multiline
        />
        <Pressable
          style={[
            styles.send,
            { backgroundColor: colors.primary },
            (!draft.trim() || addComment.isPending) && styles.sendDisabled,
          ]}
          onPress={handleSendComment}
          disabled={!draft.trim() || addComment.isPending}>
          <Text style={[styles.sendText, { color: colors.onPrimary }]}>등록</Text>
        </Pressable>
      </View>

      <ReportReasonModal
        visible={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        onSelect={handleReport}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  list: { flexGrow: 1 },
  post: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: Typography.title,
  market: { gap: Spacing.sm, marginTop: Spacing.xs },
  price: { ...Typography.title, fontSize: 24 },
  statusRow: { flexDirection: 'row', gap: Spacing.xs },
  status: { borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  recruit: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
  },
  recruitHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  joinButton: {
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  joinDisabled: { opacity: 0.4 },
  joinText: { fontSize: 15, fontWeight: '800' },
  images: { gap: Spacing.sm, marginTop: Spacing.sm },
  body: { ...Typography.body, marginTop: Spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md },
  like: { borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  empty: { ...Typography.body, textAlign: 'center', marginTop: 32 },
  comment: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  composer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    maxHeight: 120,
    ...Typography.body,
  },
  send: { borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: 11 },
  sendDisabled: { opacity: 0.4 },
  sendText: { fontSize: 15, fontWeight: '800' },
});
