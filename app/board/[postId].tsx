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
import {
  useAddComment,
  useComments,
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
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <Stack.Screen
        options={{
          title: BOARD_LABELS[post.board],
          headerRight: () => (
            <Pressable onPress={openPostMenu} hitSlop={12}>
              <Text style={[styles.headerButton, { color: colors.primary }]}>
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
              <Text style={[styles.sportTag, { color: colors.primary }]}>{post.sport}</Text>
            ) : null}
            <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
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
                          {
                            borderColor: active ? colors.primary : colors.border,
                            backgroundColor: active ? colors.primary : 'transparent',
                          },
                        ]}>
                        <Text style={{ color: active ? colors.onPrimary : colors.textMuted }}>
                          {TRADE_STATUS_LABELS[status]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
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
                  { borderColor: post.liked_by_me ? colors.primary : colors.border },
                ]}
                disabled={toggleLike.isPending}
                onPress={() => toggleLike.mutate({ postId: post.id, liked: !post.liked_by_me })}>
                <Text style={{ color: post.liked_by_me ? colors.primary : colors.textMuted }}>
                  {post.liked_by_me ? '♥' : '♡'} 좋아요 {post.like_count}
                </Text>
              </Pressable>
              <Text style={[styles.commentCount, { color: colors.textMuted }]}>
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
              <Text style={[styles.commentAuthor, { color: colors.text }]}>
                {item.author_nickname}
                {item.author_id === post.author_id ? ' (글쓴이)' : ''}
              </Text>
              <Pressable onPress={() => openCommentMenu(item)} hitSlop={10}>
                <Text style={[styles.commentMenu, { color: colors.textMuted }]}>
                  {item.is_mine ? '삭제' : '신고'}
                </Text>
              </Pressable>
            </View>
            <Text style={{ color: colors.text }}>{item.body}</Text>
            <Text style={[styles.commentTime, { color: colors.textMuted }]}>
              {formatRelativeTime(item.created_at)}
            </Text>
          </Pressable>
        )}
      />

      <View style={[styles.composer, { borderTopColor: colors.border }]}>
        <TextInput
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
          ]}
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
  headerButton: { fontSize: 15, fontWeight: '600' },
  list: { flexGrow: 1 },
  post: { padding: 16, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  sportTag: { fontSize: 13, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700' },
  meta: { fontSize: 13 },
  market: { gap: 8, marginTop: 4 },
  price: { fontSize: 20, fontWeight: '700' },
  statusRow: { flexDirection: 'row', gap: 6 },
  status: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  images: { gap: 8, marginTop: 8 },
  body: { fontSize: 15, lineHeight: 23, marginTop: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  like: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  commentCount: { fontSize: 14 },
  empty: { textAlign: 'center', marginTop: 32 },
  comment: { paddingHorizontal: 16, paddingVertical: 12, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  commentAuthor: { fontSize: 14, fontWeight: '600' },
  commentMenu: { fontSize: 12 },
  commentTime: { fontSize: 12 },
  composer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  send: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 12 },
  sendDisabled: { opacity: 0.4 },
  sendText: { fontWeight: '600' },
});
