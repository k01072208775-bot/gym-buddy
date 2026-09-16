import { useLocalSearchParams } from 'expo-router';
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

import { fetchMessages, sendMessage, subscribeToMessages } from '@/features/chat/api';
import { useAppColors } from '@/hooks/use-app-colors';
import { useSession } from '@/lib/session';
import type { Message } from '@/types/database';

export default function ChatScreen() {
  const colors = useAppColors();
  const { matchId: rawMatchId } = useLocalSearchParams<{ matchId: string }>();
  const matchId = Number(rawMatchId);
  const { session } = useSession();
  const myId = session?.user.id;

  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

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

  if (!messages) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            매칭됐어요! 먼저 인사를 건네보세요.
          </Text>
        }
        renderItem={({ item }) => {
          const mine = item.sender_id === myId;
          return (
            <View
              style={[
                styles.bubble,
                mine
                  ? { alignSelf: 'flex-end', backgroundColor: colors.bubbleMine }
                  : { alignSelf: 'flex-start', backgroundColor: colors.bubbleTheirs },
              ]}>
              <Text style={{ color: mine ? colors.bubbleMineText : colors.bubbleTheirsText }}>
                {item.body}
              </Text>
            </View>
          );
        }}
      />

      <View style={[styles.composer, { borderTopColor: colors.border }]}>
        <TextInput
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
          ]}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 8, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 40 },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
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
