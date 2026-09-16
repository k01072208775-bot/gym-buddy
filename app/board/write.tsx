import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ChoiceChips } from '@/components/ui/choice-chips';
import { PrimaryButton } from '@/components/ui/primary-button';
import { BOARDS, isBoardType, WORKOUT_SPORTS } from '@/constants/board';
import { usePost, useSavePost } from '@/features/board/hooks';
import { PostImagePicker } from '@/features/board/post-image-picker';
import { useAppColors } from '@/hooks/use-app-colors';
import type { BoardType, PostItem } from '@/types/database';

const SPORT_OPTIONS = WORKOUT_SPORTS.map((sport) => ({ value: sport, label: sport }));

/**
 * 글쓰기 / 글 수정 공용 화면.
 *   새 글:   /board/write?board=workout&sport=풋살
 *   글 수정: /board/write?postId=12
 */
export default function WritePostScreen() {
  const colors = useAppColors();
  const params = useLocalSearchParams<{ board?: string; sport?: string; postId?: string }>();
  const editingId = params.postId ? Number(params.postId) : null;
  const { data: existing, isPending } = usePost(editingId);

  // 수정일 때는 기존 글을 다 불러온 뒤에 폼을 그려야 입력칸에 내용이 채워진다
  if (editingId !== null && isPending) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (editingId !== null && !existing) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>삭제되었거나 수정할 수 없는 글이에요.</Text>
      </View>
    );
  }

  return (
    <PostForm
      editingId={editingId}
      initial={existing ?? null}
      initialBoard={isBoardType(params.board) ? params.board : 'free'}
      initialSport={params.sport && WORKOUT_SPORTS.includes(params.sport) ? params.sport : null}
    />
  );
}

function PostForm({
  editingId,
  initial,
  initialBoard,
  initialSport,
}: {
  editingId: number | null;
  initial: PostItem | null;
  initialBoard: BoardType;
  initialSport: string | null;
}) {
  const colors = useAppColors();
  const router = useRouter();
  const save = useSavePost();

  const [board, setBoard] = useState<BoardType>(initial?.board ?? initialBoard);
  const [sport, setSport] = useState<string | null>(initial?.sport ?? initialSport);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '');
  const [imageUrls, setImageUrls] = useState<string[]>(initial?.image_urls ?? []);

  const isMarket = board === 'market';
  const isWorkout = board === 'workout';
  const canSubmit =
    !!title.trim() &&
    !!body.trim() &&
    (!isMarket || price !== '') &&
    (!isWorkout || sport !== null);

  function handleSubmit() {
    if (!canSubmit) return;
    save.mutate(
      {
        postId: editingId,
        input: {
          board,
          title,
          body,
          price: isMarket ? Number(price) : null,
          sport: isWorkout ? sport : null,
          imageUrls,
        },
      },
      {
        onSuccess: (postId) => {
          if (editingId !== null) router.back();
          else router.replace(`/board/${postId}`);
        },
        onError: (err) => Alert.alert('저장 실패', (err as Error).message),
      }
    );
  }

  const inputStyle = [
    styles.input,
    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: editingId !== null ? '글 수정' : '글쓰기' }} />

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {/* 게시판 종류는 새 글일 때만 고를 수 있다 */}
        {editingId === null ? (
          <ChoiceChips options={BOARDS} value={board} onChange={setBoard} />
        ) : null}

        {isWorkout ? (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textMuted }]}>종목</Text>
            <ChoiceChips options={SPORT_OPTIONS} value={sport} onChange={setSport} />
          </View>
        ) : null}

        <TextInput
          style={inputStyle}
          value={title}
          onChangeText={setTitle}
          placeholder="제목"
          placeholderTextColor={colors.textMuted}
          maxLength={60}
        />

        {isMarket ? (
          <View>
            <TextInput
              style={inputStyle}
              value={price}
              onChangeText={(text) => setPrice(text.replace(/[^0-9]/g, '').slice(0, 9))}
              placeholder="가격 (원)"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
            <Text style={[styles.hint, { color: colors.textMuted }]}>0원으로 적으면 나눔으로 표시돼요.</Text>
          </View>
        ) : null}

        <TextInput
          style={[inputStyle, styles.bodyInput]}
          value={body}
          onChangeText={setBody}
          placeholder={BOARDS.find((item) => item.value === board)?.placeholder}
          placeholderTextColor={colors.textMuted}
          maxLength={5000}
          multiline
          textAlignVertical="top"
        />

        <PostImagePicker urls={imageUrls} onChange={setImageUrls} />

        <Text style={[styles.hint, { color: colors.textMuted }]}>
          같은 학교 학생에게만 보여요. 욕설·비방·거래 사기 글은 신고되면 제재될 수 있어요.
        </Text>

        <PrimaryButton
          label={editingId !== null ? '수정하기' : '등록하기'}
          onPress={handleSubmit}
          busy={save.isPending}
          disabled={!canSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  form: { padding: 16, gap: 12 },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  bodyInput: { minHeight: 220 },
  hint: { fontSize: 12, marginTop: 4 },
});
