import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { ReportReasonModal } from '@/components/ui/report-reason-modal';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { fetchMessages, markMatchRead, sendMessage, subscribeToMessages } from '@/features/chat/api';
import { useMatches, useRefreshMatching } from '@/features/matching/hooks';
import { reportAndBlock } from '@/features/safety/api';
import { useAppColors } from '@/hooks/use-app-colors';
import { formatClockTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Message } from '@/types/database';

export default function ChatScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const { matchId: rawMatchId } = useLocalSearchParams<{ matchId: string }>();
  const matchId = Number(rawMatchId);
  const { session } = useSession();
  const myId = session?.user.id;

  // 상대방은 이미 받아둔 매칭 목록 캐시에서 찾습니다 (추가 요청 없음)
  const { data: matches } = useMatches();
  const partner = matches?.find((match) => match.matchId === matchId)?.partner;
  const refreshMatching = useRefreshMatching();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  // 대화방을 열거나 새 메시지를 받으면 읽음으로 표시합니다.
  // 실패해도 대화 자체에는 지장이 없으므로 조용히 넘어갑니다.
  const messageCount = messages?.length ?? 0;
  useEffect(() => {
    if (!Number.isFinite(matchId)) return;
    markMatchRead(matchId).catch(() => {});
  }, [matchId, messageCount]);

  // 화면을 떠날 때 매칭 목록의 안 읽음 배지를 새로 계산하게 합니다
  useEffect(() => () => void refreshMatching(), [refreshMatching]);

  useEffect(() => {
    if (!Number.isFinite(matchId)) return;
    let cancelled = false;

    fetchMessages(matchId)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch((error) => Alert.alert('불러오기 실패', (error as Error).message));

    // 실시간 수신. cleanup 에서 반드시 구독을 끊어야 화면을 옮길 때 누수가 없습니다.
    const unsubscribe = subscribeToMessages(matchId, (incoming) => {
      setMessages((prev) => {
        if (!prev) return [incoming];
        if (prev.some((m) => m.id === incoming.id)) return prev; // 내가 보낸 것 중복 방지
        return [...prev, incoming];
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [matchId]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    try {
      const saved = await sendMessage(matchId, body);
      setDraft('');
      setMessages((prev) =>
        prev?.some((m) => m.id === saved.id) ? prev : [...(prev ?? []), saved]
      );
    } catch (error) {
      Alert.alert('전송 실패', (error as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function handleReport(reason: string) {
    if (!partner) return;
    setReportOpen(false);

    try {
      await reportAndBlock({ targetId: partner.id, reason });
      await refreshMatching();
      Alert.alert('신고가 접수됐어요', '이제 서로에게 보이지 않아요.');
      // 차단했으므로 이 대화방은 더 이상 열 수 없다
      router.back();
    } catch (error) {
      Alert.alert('신고 실패', (error as Error).message);
    }
  }

  const header = (
    <Stack.Screen
      options={{
        // 누구와 대화 중인지 보이도록 제목 자리에 상대 사진과 닉네임을 둔다
        headerTitle: () =>
          partner ? (
            <View style={styles.headerTitle}>
              <Avatar url={partner.avatar_url} name={partner.nickname} size={30} />
              <Text style={[Typography.heading, { color: colors.text }]} numberOfLines={1}>
                {partner.nickname}
              </Text>
            </View>
          ) : (
            <Text style={[Typography.heading, { color: colors.text }]}>채팅</Text>
          ),
        // 매칭 목록을 아직 못 받았으면 신고 대상을 알 수 없으므로 버튼을 숨긴다
        headerRight: () =>
          partner ? (
            <Pressable onPress={() => setReportOpen(true)} hitSlop={12}>
              <Text style={[Typography.body, { color: colors.textMuted }]}>신고</Text>
            </Pressable>
          ) : null,
      }}
    />
  );

  if (!messages) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        {header}
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // 헤더 높이(기본 44 + 노치)를 빼야 키보드와 입력칸이 겹치지 않습니다
      keyboardVerticalOffset={insets.top + 44}>
      {header}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.empty}>
            {partner ? <Avatar url={partner.avatar_url} name={partner.nickname} size={72} /> : null}
            <Text style={[Typography.heading, { color: colors.text }]}>매칭됐어요!</Text>
            <Text style={[Typography.body, { color: colors.textMuted }]}>
              언제 어디서 운동하는지 먼저 물어보세요.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const mine = item.sender_id === myId;
          const next = messages[index + 1];
          // 같은 사람이 같은 분에 연달아 보낸 메시지는 마지막 것에만 시간을 붙인다
          const showTime =
            !next ||
            next.sender_id !== item.sender_id ||
            formatClockTime(next.created_at) !== formatClockTime(item.created_at);

          return (
            <View style={[styles.messageRow, mine && styles.rowMine]}>
              <View
                style={[
                  styles.bubble,
                  { backgroundColor: mine ? colors.bubbleMine : colors.bubbleTheirs },
                ]}>
                <Text
                  style={[
                    Typography.body,
                    { color: mine ? colors.bubbleMineText : colors.bubbleTheirsText },
                  ]}>
                  {item.body}
                </Text>
              </View>
              {showTime ? (
                <Text style={[Typography.caption, styles.time, { color: colors.textMuted }]}>
                  {formatClockTime(item.created_at)}
                </Text>
              ) : null}
            </View>
          );
        }}
      />

      {/* 안드로이드 하단 내비게이션 바에 가리지 않도록 안전 영역만큼 띄웁니다 */}
      <View
        style={[
          styles.composer,
          { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, Spacing.sm) },
        ]}>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
          value={draft}
          onChangeText={setDraft}
          placeholder="메시지 입력"
          placeholderTextColor={colors.textMuted}
          maxLength={1000}
          multiline
        />
        <Pressable
          style={[
            styles.send,
            { backgroundColor: colors.primary },
            (!draft.trim() || sending) && styles.sendDisabled,
          ]}
          onPress={handleSend}
          disabled={!draft.trim() || sending}>
          <Text style={[styles.sendText, { color: colors.onPrimary }]}>전송</Text>
        </Pressable>
      </View>

      <ReportReasonModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        onSelect={handleReport}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, maxWidth: 220 },
  list: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.xs, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 60 },
  // 상대 메시지: [말풍선][시간] 왼쪽 정렬 / 내 메시지: 순서를 뒤집어 [시간][말풍선] 오른쪽 정렬
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs },
  rowMine: { flexDirection: 'row-reverse' },
  bubble: {
    maxWidth: '75%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  time: { marginBottom: 2 },
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
